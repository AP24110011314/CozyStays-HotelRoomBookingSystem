import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addMonths } from 'date-fns';
import api from '../../api/client';

export default function AdminOccupancy() {
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedRoom, setSelectedRoom] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'occupancy', month, selectedRoom],
    queryFn: async () => {
      const params = new URLSearchParams({ month });
      if (selectedRoom) params.append('roomId', selectedRoom);
      const response = await api.get(`/admin/occupancy?${params}`);
      return response.data.data;
    },
  });

  const prevMonth = () => setMonth(m => format(addMonths(new Date(m + '-01'), -1), 'yyyy-MM'));
  const nextMonth = () => setMonth(m => format(addMonths(new Date(m + '-01'), 1), 'yyyy-MM'));

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="pb-3"><div className="h-4 bg-gray-200 rounded w-24"></div></th>
                {[...Array(7)].map((_, i) => (
                  <th key={i} className="pb-3"><div className="h-4 bg-gray-200 rounded w-16"></div></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td className="py-2"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="py-2"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const days = data?.rooms?.[0]?.nights?.map(n => n.date) || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Occupancy Report</h1>
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="btn-secondary">Previous</button>
          <span className="text-lg font-medium">{format(new Date(month + '-01'), 'MMMM yyyy')}</span>
          <button onClick={nextMonth} className="btn-secondary">Next</button>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <label className="label mb-2">Filter by Room</label>
        <select
          value={selectedRoom}
          onChange={(e) => setSelectedRoom(e.target.value)}
          className="input w-auto"
        >
          <option value="">All Rooms</option>
          {data?.rooms?.map((room) => (
            <option key={room.id} value={room.id}>{room.name}</option>
          ))}
        </select>
      </div>

      {data?.rooms && data.rooms.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No rooms found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="text-left text-sm text-gray-600 border-b border-gray-200">
                <th className="pb-3 font-medium w-48 sticky left-0 bg-white z-10">Room</th>
                {days.map((day) => (
                  <th key={day} className="pb-3 font-medium w-16 text-center">
                    {format(new Date(day), 'd')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.rooms?.map((room) => (
                <tr key={room.id} className="hover:bg-gray-50">
                  <td className="py-2 font-medium sticky left-0 bg-white z-10 w-48 border-r border-gray-100">
                    {room.name}
                  </td>
                  {room.nights?.map((night) => (
                    <td key={night.date} className="py-2 text-center">
                      {night.booked ? (
                        <div className="w-8 h-8 mx-auto rounded-full bg-red-100 flex items-center justify-center" title={night.booking?.reference}>
                          <span className="text-red-600 text-xs font-medium">●</span>
                        </div>
                      ) : (
                        <div className="w-8 h-8 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-green-600 text-xs font-medium">●</span>
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-100"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-100"></div>
          <span>Booked (hover for reference)</span>
        </div>
      </div>
    </div>
  );
}