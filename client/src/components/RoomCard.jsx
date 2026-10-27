import { Link } from 'react-router-dom';
import { differenceInDays } from 'date-fns';

export default function RoomCard({ room, checkIn, checkOut }) {
  const nights = differenceInDays(new Date(checkOut), new Date(checkIn));
  const totalPrice = room.basePrice * nights;

  return (
    <Link to={`/rooms/${room.id}?checkIn=${checkIn}&checkOut=${checkOut}`} className="card group hover:shadow-md transition-shadow">
      <div className="aspect-video bg-gray-100 relative overflow-hidden">
        {room.photos && room.photos.length > 0 ? (
          <img
            src={room.photos[0]}
            alt={room.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <span className="absolute top-3 right-3 badge-info">{room.type}</span>
        {!room.active && (
          <span className="absolute top-3 left-3 badge-gray">Inactive</span>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900">{room.name}</h3>
        <p className="mt-1 text-sm text-gray-600 line-clamp-2">{room.description}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {room.amenities?.map((amenity) => (
            <span key={amenity} className="badge-gray">{amenity}</span>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-indigo-600">${(room.basePrice / 100).toFixed(2)}</span>
            <span className="text-gray-500 text-sm ml-1">/ night</span>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">{nights} night{nights !== 1 ? 's' : ''}</p>
            <p className="font-semibold text-gray-900">Total: ${(totalPrice / 100).toFixed(2)}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}