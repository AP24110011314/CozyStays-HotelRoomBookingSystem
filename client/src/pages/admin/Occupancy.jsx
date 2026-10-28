import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addMonths } from 'date-fns';
import api from '../../api/client';
import useDocumentTitle from '../../hooks/useDocumentTitle';

export default function AdminOccupancy() {
  useDocumentTitle('Occupancy Calendar');
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
      <div className="animate-pulse space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="h-8 bg-gray-200 rounded-xl w-1/4"></div>
          <div className="h-8 bg-gray-200 rounded-xl w-1/4"></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr>
                <th className="p-4"><div className="h-4 bg-gray-200 rounded w-24"></div></th>
                {[...Array(7)].map((_, i) => (
                  <th key={i} className="p-4"><div className="h-4 bg-gray-200 rounded w-16"></div></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td className="p-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="p-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
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
      <div className="mb-8 sm:mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Occupancy Report</h1>
            <p className="text-gray-600">View room occupancy by day for the selected month</p>
          </div>
          <div className="flex items-center gap-4 bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-gray-100 shadow-sm">
            <button onClick={prevMonth} className="btn-secondary text-sm px-4 py-2">Previous</button>
            <span className="text-lg font-medium text-gray-900">{format(new Date(month + '-01'), 'MMMM yyyy')}</span>
            <button onClick={nextMonth} className="btn-secondary text-sm px-4 py-2">Next</button>
          </div>
        </div>

        <div className="card-hover p-6">
          <label className="label mb-2">Filter by Room</label>
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="input w-auto sm:w-64"
          >
            <option value="">All Rooms</option>
            {data?.rooms?.map((room) => (
              <option key={room.id} value={room.id}>{room.name}</option>
            ))}
          </select>
        </div>
      </div>

      {data?.rooms && data.rooms.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <span className="text-6xl mb-4 block">📈</span>
          <p className="text-gray-600 text-lg">No rooms found</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1400px]">
              <thead>
                <tr className="bg-gray-50 text-left text-sm font-medium text-gray-600 border-b border-gray-100">
                  <th className="p-4 font-semibold w-56 sticky left-0 bg-white z-10 border-r border-gray-100 shadow-xs">Room</th>
                  {days.map((day) => (
                    <th key={day} className="px-2 py-3 font-medium min-w-[44px] text-center">
                      <span className="block text-sm font-bold text-gray-800">{format(new Date(day), 'd')}</span>
                      <span className="text-[11px] font-semibold text-gray-400 uppercase">{format(new Date(day), 'EEE')}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.rooms?.map((room) => (
                  <tr key={room.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium sticky left-0 bg-white z-10 w-56 border-r border-gray-100 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-indigo-100 to-amber-100 flex-shrink-0">
                          {room.photos && room.photos.length > 0 ? (
                            <img src={room.photos[0]} alt={room.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <span className="truncate text-sm font-semibold text-gray-800">{room.name}</span>
                      </div>
                    </td>
                    {room.nights?.map((night) => (
                      <td key={night.date} className="px-1 py-3 text-center">
                        {night.booked ? (
                          <div className="w-8 h-8 mx-auto rounded-full bg-red-100 flex items-center justify-center relative group" title={night.booking?.reference}>
                            <span className="text-red-600 text-sm font-bold">●</span>
                            {night.booking?.reference && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-md">
                                {night.booking.reference}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-8 h-8 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-green-600 text-sm font-bold">●</span>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-xl">
          <div className="w-4 h-4 rounded-full bg-green-100"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded-xl">
          <div className="w-4 h-4 rounded-full bg-red-100"></div>
          <span>Booked (hover for reference)</span>
        </div>
      </div>
    </div>
  );
}