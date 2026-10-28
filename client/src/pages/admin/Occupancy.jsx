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

  const prevMonth = () => setMonth((m) => format(addMonths(new Date(m + '-01'), -1), 'yyyy-MM'));
  const nextMonth = () => setMonth((m) => format(addMonths(new Date(m + '-01'), 1), 'yyyy-MM'));

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="h-8 bg-taupe/40 rounded-xl w-1/4"></div>
          <div className="h-8 bg-taupe/40 rounded-xl w-1/4"></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr>
                <th className="p-4"><div className="h-4 bg-taupe/40 rounded w-24"></div></th>
                {[...Array(7)].map((_, i) => (
                  <th key={i} className="p-4"><div className="h-4 bg-taupe/40 rounded w-16"></div></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td className="p-4"><div className="h-4 bg-taupe/40 rounded w-24"></div></td>
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="p-4"><div className="h-4 bg-taupe/40 rounded w-16"></div></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const days = data?.rooms?.[0]?.nights?.map((n) => n.date) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">Occupancy Report</h1>
          <p className="text-sm text-charcoal/60 mt-1">View room occupancy by day for the selected month</p>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-xl p-2.5 border border-taupe shadow-xs">
          <button onClick={prevMonth} className="btn-secondary text-xs px-3 py-1.5 min-h-[36px]">Previous</button>
          <span className="text-sm font-bold text-forest px-2">{format(new Date(month + '-01'), 'MMMM yyyy')}</span>
          <button onClick={nextMonth} className="btn-secondary text-xs px-3 py-1.5 min-h-[36px]">Next</button>
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        <label htmlFor="room-filter" className="label mb-1.5">Filter by Room</label>
        <select
          id="room-filter"
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

      {data?.rooms && data.rooms.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-taupe">
          <span className="text-5xl mb-4 block">📈</span>
          <p className="text-charcoal font-semibold text-base">No rooms found</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1400px]">
              <thead>
                <tr className="bg-taupe-50 text-left text-sm font-medium text-charcoal/70 border-b border-taupe">
                  <th className="p-4 font-semibold w-56 sticky left-0 bg-taupe-50 z-10 border-r border-taupe shadow-xs">Room</th>
                  {days.map((day) => (
                    <th key={day} className="px-2 py-3 font-medium min-w-[44px] text-center">
                      <span className="block text-sm font-bold text-charcoal">{format(new Date(day), 'd')}</span>
                      <span className="text-[11px] font-semibold text-charcoal/50 uppercase">{format(new Date(day), 'EEE')}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-taupe">
                {data?.rooms?.map((room) => (
                  <tr key={room.id} className="hover:bg-taupe-50/70 transition-colors">
                    <td className="p-4 font-medium sticky left-0 bg-white z-10 w-56 border-r border-taupe shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-taupe-100 flex-shrink-0 border border-taupe">
                          {room.photos && room.photos.length > 0 ? (
                            <img src={room.photos[0]} alt={room.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-charcoal/40">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <span className="truncate text-sm font-semibold text-charcoal">{room.name}</span>
                      </div>
                    </td>
                    {room.nights?.map((night) => (
                      <td key={night.date} className="px-1 py-3 text-center">
                        {night.booked ? (
                          <div className="w-8 h-8 mx-auto rounded-full bg-brick-50 border border-brick-200 flex items-center justify-center relative group" title={night.booking?.reference}>
                            <span className="text-brick text-sm font-bold">●</span>
                            {night.booking?.reference && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-charcoal text-ivory text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-md">
                                {night.booking.reference}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-8 h-8 mx-auto rounded-full bg-forest-50 border border-forest-200 flex items-center justify-center">
                            <span className="text-forest text-sm font-bold">●</span>
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

      <div className="mt-6 flex flex-wrap gap-4 text-xs font-semibold">
        <div className="flex items-center gap-2 bg-forest-50 border border-forest-200 px-3 py-2 rounded-xl text-forest">
          <div className="w-3.5 h-3.5 rounded-full bg-forest"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2 bg-brick-50 border border-brick-200 px-3 py-2 rounded-xl text-brick">
          <div className="w-3.5 h-3.5 rounded-full bg-brick"></div>
          <span>Booked (hover for reference)</span>
        </div>
      </div>
    </div>
  );
}
