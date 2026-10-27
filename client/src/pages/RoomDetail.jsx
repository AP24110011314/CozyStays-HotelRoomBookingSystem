import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../api/client';
import DateRangePicker from '../components/DateRangePicker';

export default function RoomDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const checkIn = searchParams.get('checkIn') || format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
  const checkOut = searchParams.get('checkOut') || format(new Date(Date.now() + 2 * 86400000), 'yyyy-MM-dd');

  const { data: room, isLoading } = useQuery({
    queryKey: ['room', id],
    queryFn: async () => {
      const response = await api.get(`/rooms/${id}`);
      return response.data.data;
    },
  });

  const handleDateChange = (newCheckIn, newCheckOut) => {
    setSearchParams({ checkIn: newCheckIn, checkOut: newCheckOut });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="aspect-video bg-gray-200 rounded-xl"></div>
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Room not found</p>
        <Link to="/" className="text-indigo-600 hover:text-indigo-500 mt-4 inline-block">Back to rooms</Link>
      </div>
    );
  }

  const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
  const totalPrice = room.basePrice * nights;

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/" className="text-indigo-600 hover:text-indigo-500 mb-6 inline-flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to rooms
      </Link>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          {room.photos && room.photos.length > 0 ? (
            <img
              src={room.photos[0]}
              alt={room.name}
              className="aspect-video w-full rounded-xl object-cover"
            />
          ) : (
            <div className="aspect-video w-full rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
              <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="badge-info mb-2">{room.type}</span>
              <h1 className="text-3xl font-bold text-gray-900">{room.name}</h1>
            </div>
          </div>

          <p className="text-gray-600 mb-6">{room.description}</p>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {room.amenities?.map((amenity) => (
                <span key={amenity} className="badge-gray">{amenity}</span>
              ))}
            </div>
          </div>

          <DateRangePicker
            checkIn={checkIn}
            checkOut={checkOut}
            onChange={handleDateChange}
          />

          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">${(room.basePrice / 100).toFixed(2)} × {nights} night{nights !== 1 ? 's' : ''}</span>
              <span className="font-medium">${(totalPrice / 100).toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between">
              <span className="text-lg font-semibold text-gray-900">Total</span>
              <span className="text-xl font-bold text-indigo-600">${(totalPrice / 100).toFixed(2)}</span>
            </div>
          </div>

          <Link
            to={`/rooms/${id}/book?checkIn=${checkIn}&checkOut=${checkOut}`}
            className="btn-primary w-full text-center mt-6 block"
          >
            Book Now
          </Link>
        </div>
      </div>
    </div>
  );
}