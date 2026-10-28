import { useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInDays, addDays } from 'date-fns';
import { ChevronLeft, Wifi, Tv, Wind, Coffee, Bath, Car, Sparkles, Check, Calendar, Users, ShieldCheck } from 'lucide-react';
import api from '../api/client';
import DateRangePicker from '../components/DateRangePicker';
import { formatINR } from '../utils/currency';
import useDocumentTitle from '../hooks/useDocumentTitle';

function getAmenityIcon(amenity) {
  const lower = amenity.toLowerCase();
  if (lower.includes('wifi') || lower.includes('wi-fi')) return <Wifi className="w-4 h-4 text-forest" />;
  if (lower.includes('tv')) return <Tv className="w-4 h-4 text-forest" />;
  if (lower.includes('ac') || lower.includes('air') || lower.includes('conditioning')) return <Wind className="w-4 h-4 text-forest" />;
  if (lower.includes('coffee') || lower.includes('breakfast')) return <Coffee className="w-4 h-4 text-forest" />;
  if (lower.includes('bath') || lower.includes('tub') || lower.includes('shower')) return <Bath className="w-4 h-4 text-forest" />;
  if (lower.includes('park') || lower.includes('car')) return <Car className="w-4 h-4 text-forest" />;
  if (lower.includes('pool') || lower.includes('view') || lower.includes('balcony')) return <Sparkles className="w-4 h-4 text-forest" />;
  return <Check className="w-4 h-4 text-forest" />;
}

export default function RoomDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const checkIn = searchParams.get('checkIn') || format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const checkOut = searchParams.get('checkOut') || format(addDays(new Date(), 3), 'yyyy-MM-dd');

  const { data: room, isLoading, error } = useQuery({
    queryKey: ['room', id],
    queryFn: async () => {
      const response = await api.get(`/rooms/${id}`);
      return response.data.data;
    },
  });

  useDocumentTitle(room?.name || 'Room Details');

  const handleDateChange = (newCheckIn, newCheckOut) => {
    const next = new URLSearchParams(searchParams);
    next.set('checkIn', newCheckIn);
    next.set('checkOut', newCheckOut);
    setSearchParams(next);
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-10 bg-taupe/40 rounded-xl w-32"></div>
        <div className="aspect-[16/9] md:aspect-[21/9] bg-taupe/40 rounded-3xl"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-8 bg-taupe/40 rounded w-2/3"></div>
            <div className="h-4 bg-taupe/40 rounded w-full"></div>
            <div className="h-4 bg-taupe/40 rounded w-4/5"></div>
          </div>
          <div className="h-64 bg-taupe/40 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 bg-white rounded-3xl border border-taupe p-8">
        <span className="text-5xl mb-4 block">🔍</span>
        <h2 className="text-xl font-bold text-charcoal mb-2">Room not found</h2>
        <p className="text-charcoal/60 mb-6 text-sm">The room you are looking for is unavailable or does not exist.</p>
        <Link to="/" className="btn-primary inline-flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" />
          Back to available rooms
        </Link>
      </div>
    );
  }

  const nights = Math.max(1, differenceInDays(new Date(checkOut), new Date(checkIn)) || 1);
  const totalPrice = room.basePrice * nights;
  const photos = room.photos && room.photos.length > 0 ? room.photos : [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24 md:pb-10">
      {/* Back button */}
      <div>
        <Link
          to={`/?checkIn=${checkIn}&checkOut=${checkOut}`}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-charcoal bg-white border border-taupe hover:bg-taupe/30 transition-colors min-h-[44px]"
        >
          <ChevronLeft className="w-4 h-4 text-forest" />
          Back to Rooms
        </Link>
      </div>

      {/* Hero Image Gallery (Responsive stacked / swipeable on mobile) */}
      <div className="space-y-3">
        <div className="aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9] rounded-3xl overflow-hidden bg-taupe-100 relative shadow-xs border border-taupe">
          {photos.length > 0 ? (
            <img
              src={photos[selectedPhotoIndex] || photos[0]}
              alt={room.name}
              className="w-full h-full object-cover transition-opacity duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-charcoal/40">
              <span className="text-sm font-medium">No photo available</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="badge-forest px-3 py-1 text-xs font-semibold uppercase shadow-xs backdrop-blur-md">
              {room.type}
            </span>
            {!room.active && (
              <span className="badge-brick px-3 py-1 text-xs font-semibold shadow-xs">
                Inactive
              </span>
            )}
          </div>
        </div>

        {/* Thumbnail Selector (horizontal scroll on mobile) */}
        {photos.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {photos.map((photo, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedPhotoIndex(idx)}
                className={`relative flex-shrink-0 w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  selectedPhotoIndex === idx
                    ? 'border-forest ring-2 ring-forest/30 shadow-xs'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
                aria-label={`View photo ${idx + 1}`}
              >
                <img src={photo} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Room info & date selection */}
        <div className="lg:col-span-2 space-y-8">
          {/* Title & Description */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-taupe shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-taupe pb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal">{room.name}</h1>
                <p className="text-xs sm:text-sm text-charcoal/60 mt-1 capitalize font-medium">
                  {room.type} Suite &bull; Up to {room.maxGuests} Guests
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-2xl sm:text-3xl font-bold text-forest">{formatINR(room.basePrice)}</span>
                <span className="text-xs text-charcoal/60 font-medium block">per night</span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider">About This Room</h3>
              <p className="text-charcoal/80 text-sm leading-relaxed whitespace-pre-line">
                {room.description}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-taupe">
              <div className="flex items-center gap-2.5 text-xs text-charcoal/80">
                <Users className="w-4 h-4 text-forest" />
                <span>Max {room.maxGuests} Guests</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-charcoal/80">
                <Calendar className="w-4 h-4 text-forest" />
                <span>Daily Housekeeping</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-charcoal/80">
                <ShieldCheck className="w-4 h-4 text-forest" />
                <span>Free Cancellation</span>
              </div>
            </div>
          </div>

          {/* Amenities Grid */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-taupe shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-forest" />
              Room Amenities & Features
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {room.amenities?.map((amenity) => (
                <div
                  key={amenity}
                  className="flex items-center gap-2 p-3 rounded-2xl bg-taupe-50 border border-taupe text-xs font-semibold text-charcoal"
                >
                  {getAmenityIcon(amenity)}
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range Picker Section */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-taupe shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-forest" />
                Stay Dates
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-forest-50 text-forest border border-forest-200">
                {nights} night{nights !== 1 ? 's' : ''}
              </span>
            </div>
            <DateRangePicker
              checkIn={checkIn}
              checkOut={checkOut}
              onChange={handleDateChange}
            />
          </div>
        </div>

        {/* Right Column: Desktop Booking Summary Card */}
        <aside className="hidden lg:block lg:col-span-1 bg-white rounded-3xl p-6 border border-taupe shadow-md space-y-6 sticky top-28">
          <div className="space-y-1 border-b border-taupe pb-4">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-forest">{formatINR(room.basePrice)}</span>
              <span className="text-xs text-charcoal/60 font-medium">/ night</span>
            </div>
            <p className="text-xs text-charcoal/60">Live cloud rates including all taxes</p>
          </div>

          {/* Breakdown */}
          <div className="space-y-3 text-xs">
            <div className="flex justify-between text-charcoal/80">
              <span>{formatINR(room.basePrice)} &times; {nights} night{nights !== 1 ? 's' : ''}</span>
              <span className="font-semibold text-charcoal">{formatINR(totalPrice)}</span>
            </div>
            <div className="flex justify-between text-charcoal/80">
              <span>Dates</span>
              <span className="font-medium text-charcoal">
                {format(new Date(checkIn), 'MMM d')} - {format(new Date(checkOut), 'MMM d')}
              </span>
            </div>
            <div className="flex justify-between text-charcoal/80">
              <span>Taxes & service fee</span>
              <span className="font-semibold text-forest">Included</span>
            </div>

            <div className="border-t border-taupe pt-3 flex justify-between items-baseline">
              <span className="text-sm font-bold text-charcoal">Total</span>
              <span className="text-2xl font-extrabold text-forest">{formatINR(totalPrice)}</span>
            </div>
          </div>

          <Link
            to={`/rooms/${id}/book?checkIn=${checkIn}&checkOut=${checkOut}`}
            className="btn-primary w-full justify-center py-3.5 text-sm font-bold shadow-xs hover:shadow-sm min-h-[48px]"
          >
            Reserve Now
          </Link>

          <p className="text-[11px] text-charcoal/50 text-center leading-tight">
            You will receive instant confirmation and an email with a calendar invite (.ics).
          </p>
        </aside>
      </div>

      {/* Sticky Mobile Bottom Booking Bar (visible <1024px) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-taupe p-4 lg:hidden shadow-2xl safe-area-bottom">
        <div className="container-main flex items-center justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-forest">{formatINR(totalPrice)}</span>
              <span className="text-xs text-charcoal/60 font-medium">({nights}n)</span>
            </div>
            <p className="text-[11px] text-charcoal/60">
              {format(new Date(checkIn), 'MMM d')} - {format(new Date(checkOut), 'MMM d')}
            </p>
          </div>
          <Link
            to={`/rooms/${id}/book?checkIn=${checkIn}&checkOut=${checkOut}`}
            className="btn-primary text-sm font-bold px-6 py-3 min-h-[44px] shadow-xs flex items-center justify-center"
          >
            Book Now
          </Link>
        </div>
      </div>
    </div>
  );
}
