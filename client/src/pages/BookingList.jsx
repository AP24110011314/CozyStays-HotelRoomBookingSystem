import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, ChevronRight, ChevronLeft, ArrowRight, BedDouble } from 'lucide-react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { formatINR } from '../utils/currency';
import useDocumentTitle from '../hooks/useDocumentTitle';

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
  useDocumentTitle('My Bookings');
  const queryClient = useQueryClient();
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

  const cancelMutation = useMutation({
    mutationFn: async (bookingId) => {
      const response = await api.delete(`/bookings/${bookingId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Booking cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to cancel booking');
    },
  });

  const handleCancelBooking = (bookingId, bookingRef) => {
    if (!window.confirm(`Are you sure you want to cancel booking ${bookingRef}?`)) return;
    cancelMutation.mutate(bookingId);
  };

  const bookingsList = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1, page: 1 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">My Bookings</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review your upcoming, active, and past reservations
          </p>
        </div>
        <Link
          to="/"
          className="btn-primary inline-flex items-center gap-2 text-xs sm:text-sm px-4 py-2.5 min-h-[44px] self-start sm:self-auto"
        >
          <BedDouble className="w-4 h-4" />
          Book another room
        </Link>
      </div>

      {/* Status Filter Tabs (horizontal scroll on mobile) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { key: '', label: 'All Bookings' },
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'active', label: 'Active' },
          { key: 'completed', label: 'Past / Completed' },
          { key: 'cancelled', label: 'Cancelled' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setStatus(tab.key);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap min-h-[44px] transition-all ${
              status === tab.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200/80 space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              <div className="h-6 bg-slate-200 rounded w-1/2"></div>
              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : bookingsList.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 space-y-4">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No reservations found</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            {status ? `You have no ${status} bookings.` : 'You haven\'t made any room reservations yet.'}
          </p>
          <Link to="/" className="btn-primary inline-flex items-center gap-2 text-xs px-4 py-2 mt-2">
            Browse Available Rooms
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookingsList.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              {/* Left room info */}
              <Link
                to={`/bookings/${booking.id}`}
                className="flex items-center gap-4 min-w-0 flex-1 hover:opacity-90 transition-opacity"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                  {booking.room?.photos?.[0] ? (
                    <img
                      src={booking.room.photos[0]}
                      alt={booking.room.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                      No Photo
                    </div>
                  )}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {booking.reference}
                    </span>
                    <span className={`${statusColors[booking.status]} px-2 py-0.5 text-[11px] font-semibold uppercase`}>
                      {statusLabels[booking.status]}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                    {booking.room?.name}
                  </h3>
                  <p className="text-xs text-slate-500 capitalize">
                    {booking.room?.type} Suite &bull; {booking.guests} Guest{booking.guests !== 1 ? 's' : ''}
                  </p>
                </div>
              </Link>

              {/* Middle dates & pricing */}
              <div className="flex flex-row md:flex-col justify-between md:items-end text-xs text-slate-600 border-t md:border-t-0 pt-3 md:pt-0">
                <div className="text-left md:text-right">
                  <span className="text-slate-400 block text-[11px]">Stay Dates</span>
                  <span className="font-semibold text-slate-800">
                    {format(new Date(booking.checkIn), 'MMM d')} - {format(new Date(booking.checkOut), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="text-right mt-1">
                  <span className="text-slate-400 block text-[11px]">Total Paid</span>
                  <span className="text-base font-extrabold text-indigo-600">
                    {formatINR(booking.totalPrice)}
                  </span>
                </div>
              </div>

              {/* Right Action buttons */}
              <div className="flex items-center justify-end gap-2 border-t md:border-t-0 pt-3 md:pt-0">
                {booking.canCancel && booking.status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => handleCancelBooking(booking.id, booking.reference)}
                    disabled={cancelMutation.isPending}
                    className="btn-danger text-xs px-3 py-2 min-h-[36px]"
                  >
                    {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
                  </button>
                )}
                {booking.status === 'upcoming' && !booking.canCancel && (
                  <span className="text-[11px] text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                    48h window closed
                  </span>
                )}
                <Link
                  to={`/bookings/${booking.id}`}
                  className="btn-secondary text-xs px-3 py-2 min-h-[36px] inline-flex items-center gap-1 group-hover:border-indigo-300"
                >
                  <span>Details</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn-secondary text-xs px-3 py-2 min-h-[44px] inline-flex items-center gap-1 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="px-4 text-xs font-semibold text-slate-600">
            Page {meta.page} of {meta.totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={page >= meta.totalPages}
            className="btn-secondary text-xs px-3 py-2 min-h-[44px] inline-flex items-center gap-1 disabled:opacity-40"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}