import { Link } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import { formatINR } from '../utils/currency';
import { Wifi, Tv, Wind, Coffee, Bath, Car, Sparkles, Check } from 'lucide-react';

function getAmenityIcon(amenity) {
  const lower = amenity.toLowerCase();
  if (lower.includes('wifi') || lower.includes('wi-fi')) return <Wifi className="w-3.5 h-3.5" />;
  if (lower.includes('tv')) return <Tv className="w-3.5 h-3.5" />;
  if (lower.includes('ac') || lower.includes('air') || lower.includes('conditioning')) return <Wind className="w-3.5 h-3.5" />;
  if (lower.includes('coffee') || lower.includes('breakfast')) return <Coffee className="w-3.5 h-3.5" />;
  if (lower.includes('bath') || lower.includes('tub') || lower.includes('shower')) return <Bath className="w-3.5 h-3.5" />;
  if (lower.includes('park') || lower.includes('car')) return <Car className="w-3.5 h-3.5" />;
  if (lower.includes('pool') || lower.includes('view') || lower.includes('balcony')) return <Sparkles className="w-3.5 h-3.5" />;
  return <Check className="w-3.5 h-3.5" />;
}

export default function RoomCard({ room, checkIn, checkOut }) {
  const nights = differenceInDays(new Date(checkOut), new Date(checkIn)) || 1;
  const totalPrice = room.totalPrice || (room.basePrice * nights);

  return (
    <Link
      to={`/rooms/${room.id}?checkIn=${checkIn}&checkOut=${checkOut}`}
      className="card-hover group flex flex-col h-full overflow-hidden"
      aria-label={`View ${room.name} - ${room.type} room`}
    >
      {/* Image Section: 4:3 aspect ratio, lazy loaded */}
      <div className="aspect-[4/3] relative overflow-hidden bg-taupe-100">
        {room.photos && room.photos.length > 0 ? (
          <img
            src={room.photos[0]}
            alt={`${room.name} - ${room.type} room`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-charcoal/40" data-testid="room-placeholder">
            <svg className="w-16 h-16 text-charcoal/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Type Badge */}
        <div className="absolute top-3 right-3">
          <span className="badge-forest mac-glass-badge px-3 py-1 text-xs font-semibold shadow-xs">
            {room.type.charAt(0).toUpperCase() + room.type.slice(1)}
          </span>
        </div>

        {/* Status Badge */}
        {!room.active && (
          <span className="absolute top-3 left-3 badge-brick mac-glass-badge text-xs font-semibold">Inactive</span>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="text-base sm:text-lg font-bold text-charcoal line-clamp-1 group-hover:text-forest transition-colors">
            {room.name}
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-charcoal/70 line-clamp-2 mb-3.5 flex-1 leading-relaxed">
          {room.description}
        </p>

        {/* Amenities with Lucide Icons */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {room.amenities?.slice(0, 4).map((amenity) => (
            <span
              key={amenity}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-taupe/40 backdrop-blur-xs text-charcoal-700 border border-taupe/50"
            >
              {getAmenityIcon(amenity)}
              <span>{amenity}</span>
            </span>
          ))}
          {room.amenities && room.amenities.length > 4 && (
            <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-forest-50 text-forest border border-forest-200">
              +{room.amenities.length - 4}
            </span>
          )}
        </div>

        {/* Price & Total */}
        <div className="mt-auto pt-3.5 border-t border-taupe/60 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-bold text-forest">{formatINR(room.basePrice)}</span>
            <span className="text-charcoal/60 text-xs font-medium">/ night</span>
          </div>
          <div className="text-right">
            <p className="text-xs text-charcoal/60 font-medium">{nights} night{nights !== 1 ? 's' : ''}</p>
            <p className="font-bold text-charcoal text-sm sm:text-base">Total: {formatINR(totalPrice)}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
