import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../api/client';
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

export default function AdminBookings() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'bookings', status, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (status) params.append('status', status);
      const response = await api.get(`/admin/bookings?${params}`);
      return response.data;
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/bookings/${id}`),
    onSuccess: () => {
      toast.success('Booking cancelled');
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to cancel booking');
    },
  });

  const handleCancel = (bookingId) => {
    if (window.confirm('Cancel this booking?')) {
      cancelBookingMutation.mutate(bookingId);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="card p-6">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">All Bookings</h1>
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
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-600 border-b border-gray-200">
                  <th className="pb-3 font-medium">Reference</th>
                  <th className="pb-3 font-medium">Guest</th>
                  <th className="pb-3 font-medium">Room</th>
                  <th className="pb-3 font-medium">Dates</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.data?.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="py-4 font-mono font-medium">{booking.reference}</td>
                    <td className="py-4">
                      <div>
                        <p className="font-medium">{booking.guest?.name}</p>
                        <p className="text-sm text-gray-600">{booking.guest?.email}</p>
                      </div>
                    </td>
                    <td className="py-4">{booking.room?.name}</td>
                    <td className="py-4">
                      <p className="text-sm">
                        {format(new Date(booking.checkIn), 'MMM d')} - {format(new Date(booking.checkOut), 'MMM d, yyyy')}
                      </p>
                    </td>
                    <td className="py-4">
                      <span className={`${statusColors[booking.status]}`}>
                        {statusLabels[booking.status]}
                      </span>
                    </td>
                    <td className="py-4 font-medium">${(booking.totalPrice / 100).toFixed(2)}</td>
                    <td className="py-4">
                      {booking.status !== 'cancelled' && (
                        <button
                          onClick={() => handleCancel(booking.id)}
                          disabled={cancelBookingMutation.isPending}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data?.data?.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600">No bookings found</p>
              </div>
            )}
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