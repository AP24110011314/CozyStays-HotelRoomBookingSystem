import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../api/client';
import toast from 'react-hot-toast';

const statusLabels = {
  upcoming: 'Upcoming',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const statusColors = {
  upcoming: 'badge-info',
  active: 'badge-success',
  completed: 'badge-gray',
  cancelled: 'badge-danger',
};

export default function BookingList() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', status, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: '10' });
      if (status) params.append('status', status);
      const response = await api.get(`/bookings?${params}`);
      return response.data;
    },
  });

  const cancelBooking = async (bookingId, bookingRef) => {
    if (!window.confirm(`Are you sure you want to cancel booking ${bookingRef}?`)) return;
    try {
      await api.delete(`/bookings/${bookingId}`);
      toast.success('Booking cancelled');
      // Invalidate queries to refresh the list
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to cancel booking');
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card p-6">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="mt-4 h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
        <div className="flex gap-2">
          {['', 'upcoming', 'active', 'past', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s || ''); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                status === s || (s === '' && !status)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {s ? statusLabels[s] : 'All'}
            </button>
          ))}
        </div>
      </div>

      {data?.data && data.data.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No bookings found</p>
          <Link to="/" className="text-indigo-600 hover:text-indigo-500 mt-4 inline-block">Browse rooms</Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {data?.data?.map((booking) => (
              <Link
                key={booking.id}
                to={`/bookings/${booking.id}`}
                className="card p-4 hover:shadow-md transition-shadow block"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                      {booking.room?.photos?.[0] ? (
                        <img src={booking.room.photos[0]} alt={booking.room.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{booking.room?.name}</h3>
                      <p className="text-sm text-gray-600">{booking.room?.type}</p>
                    </div>
                  </div>

                  <div className="flex flex-col md:items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`${statusColors[booking.status]} text-sm`}>
                        {statusLabels[booking.status]}
                      </span>
                      <span className="font-mono text-sm text-gray-600">{booking.reference}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {format(new Date(booking.checkIn), 'MMM d')} - {format(new Date(booking.checkOut), 'MMM d, yyyy')}
                      </p>
                      <p className="font-semibold text-gray-900">${(booking.totalPrice / 100).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {booking.canCancel && booking.status !== 'cancelled' && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        cancelBooking(booking.id, booking.reference);
                      }}
                      className="btn-danger text-sm"
                    >
                      Cancel Booking
                    </button>
                  </div>
                )}
              </Link>
            ))}
          </div>

          {data?.meta && data.meta.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary"
              >
                Previous
              </button>
              <span className="text-gray-600">Page {page} of {data.meta.totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(data.meta.totalPages, p + 1))}
                disabled={page === data.meta.totalPages}
                className="btn-secondary"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}