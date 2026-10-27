import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../api/client';
import RoomCard from '../components/RoomCard';
import DateRangePicker from '../components/DateRangePicker';

export default function Rooms() {
  const [searchParams, setSearchParams] = useSearchParams();
  const checkIn = searchParams.get('checkIn') || format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
  const checkOut = searchParams.get('checkOut') || format(new Date(Date.now() + 2 * 86400000), 'yyyy-MM-dd');

  const { data, isLoading, error } = useQuery({
    queryKey: ['rooms', 'availability', checkIn, checkOut],
    queryFn: async () => {
      const response = await api.get('/rooms', {
        params: { checkIn, checkOut },
      });
      return response.data.data;
    },
  });

  const handleDateChange = (newCheckIn, newCheckOut) => {
    setSearchParams({ checkIn: newCheckIn, checkOut: newCheckOut });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Available Rooms</h1>
        <p className="mt-1 text-gray-600">Find the perfect room for your stay</p>
      </div>

      <DateRangePicker
        checkIn={checkIn}
        checkOut={checkOut}
        onChange={handleDateChange}
      />

      <div className="mt-8">
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-video bg-gray-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">Failed to load rooms. Please try again.</p>
          </div>
        ) : data && data.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No rooms available for the selected dates.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data?.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                checkIn={checkIn}
                checkOut={checkOut}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}