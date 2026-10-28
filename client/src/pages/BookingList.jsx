import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronRight, ChevronLeft, ArrowRight, BedDouble, CreditCard } from 'lucide-react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/currency';
import useDocumentTitle from '../hooks/useDocumentTitle';
import PaymentBadge from '../components/PaymentBadge';
import HoldCountdown from '../components/HoldCountdown';

const statusLabels = {
  upcoming: 'Upcoming',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
  pending_payment: 'Pending Payment',
  expired: 'Expired',
};

const statusColors = {
  upcoming: 'badge-forest',
  active: 'badge-brass',
  completed: 'badge-taupe',
  cancelled: 'badge-brick',
  pending_payment: 'badge-brass',
  expired: 'badge-brick',
};

export default function BookingList() {
  useDocumentTitle('My Bookings');
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Fetch public config
  const { data: publicConfig } = useQuery({
    queryKey: ['config', 'public'],
    queryFn: async () => {
      const response = await api.get('/config/public');
      return response.data?.data || {};
    },
    staleTime: 60 * 1000,
  });

  const currency = publicConfig?.currency || 'INR';

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
    onSuccess: (res) => {
      const msg = res.message || 'Booking cancelled successfully';
      toast.success(msg);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-taupe pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal">My Bookings</h1>
          <p className="text-xs sm:text-sm text-charcoal/60 mt-1">
            Review your upcoming, active, and past reservations
          </p>
        </div>
        <Link
          to="/"
          className="btn-primary inline-flex items-center gap-2 text-xs sm:text-sm px-4 py-2.5 min-h-[44px] self-start sm:self-auto"
        >
          <span>Find another room</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { label: 'All Bookings', value: '' },
          { label: 'Upcoming', value: 'upcoming' },
          { label: 'Pending Payment', value: 'pending_payment' },
          { label: 'Active', value: 'active' },
          { label: 'Completed', value: 'completed' },
          { label: 'Cancelled', value: 'cancelled' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-colors min-h-[40px] cursor-pointer ${
              status === tab.value
                ? 'bg-forest text-ivory shadow-xs'
                : 'bg-white text-charcoal/70 border border-taupe hover:bg-taupe-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-taupe/40 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : bookingsList.length === 0 ? (
        <div className="max-w-md mx-auto text-center py-16 px-4 bg-white rounded-3xl border border-taupe p-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-forest-50 text-forest flex items-center justify-center mx-auto">
            <BedDouble className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-charcoal">No reservations found</h2>
          <p className="text-xs text-charcoal/60 max-w-sm mx-auto">
            {status ? `You do not have any ${status.replace('_', ' ')} reservations.` : 'You have not booked any stays with us yet.'}
          </p>
          <Link to="/" className="btn-primary inline-flex items-center gap-2 text-xs py-2 px-4 mt-2">
            Explore Available Rooms
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookingsList.map((booking) => {
            const isPending = booking.status === 'pending_payment';
            return (
              <div
                key={booking.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-taupe shadow-xs hover:shadow-md hover:border-taupe-400 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                {/* Left room info */}
                <Link
                  to={`/bookings/${booking.id}`}
                  className="flex items-center gap-4 min-w-0 flex-1 hover:opacity-90 transition-opacity"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-taupe-100 flex-shrink-0">
                    {booking.room?.photos?.[0] ? (
                      <img
                        src={booking.room.photos[0]}
                        alt={booking.room.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-charcoal/40 text-xs">
                        No Photo
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-forest bg-forest-50 px-2 py-0.5 rounded border border-forest-200">
                        {booking.reference}
                      </span>
                      <span className={`${statusColors[booking.status] || 'badge-taupe'} px-2 py-0.5 text-[11px] font-semibold uppercase`}>
                        {statusLabels[booking.status] || booking.status}
                      </span>
                      <PaymentBadge status={booking.paymentStatus} />
                    </div>
                    <h3 className="text-base font-bold text-charcoal truncate group-hover:text-forest transition-colors">
                      {booking.room?.name}
                    </h3>
                    <p className="text-xs text-charcoal/60 capitalize">
                      {booking.room?.type} &bull; {booking.guests} Guest{booking.guests !== 1 ? 's' : ''}
                    </p>
                  </div>
                </Link>

                {/* Middle dates & pricing */}
                <div className="flex flex-row md:flex-col justify-between md:items-end text-xs text-charcoal/70 border-t md:border-t-0 border-taupe pt-3 md:pt-0">
                  <div className="text-left md:text-right">
                    <span className="text-charcoal/50 block text-[11px]">Stay Dates</span>
                    <span className="font-semibold text-charcoal">
                      {format(new Date(booking.checkIn), 'MMM d')} - {format(new Date(booking.checkOut), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="text-right mt-1">
                    <span className="text-charcoal/50 block text-[11px]">Total Price</span>
                    <span className="text-base font-extrabold text-forest">
                      {formatCurrency(booking.totalPrice, currency)}
                    </span>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center justify-end gap-2 border-t md:border-t-0 border-taupe pt-3 md:pt-0">
                  {isPending && booking.holdExpiresAt && (
                    <HoldCountdown expiresAt={booking.holdExpiresAt} />
                  )}

                  {isPending ? (
                    <Link
                      to={`/bookings/${booking.id}`}
                      className="btn-primary text-xs px-3.5 py-2 min-h-[38px] inline-flex items-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Pay Now</span>
                    </Link>
                  ) : (
                    <>
                      {booking.canCancel && booking.status !== 'cancelled' && booking.status !== 'expired' && (
                        <button
                          type="button"
                          onClick={() => handleCancelBooking(booking.id, booking.reference)}
                          disabled={cancelMutation.isPending}
                          className="btn-danger text-xs px-3 py-2 min-h-[36px]"
                        >
                          {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
                        </button>
                      )}
                      <Link
                        to={`/bookings/${booking.id}`}
                        className="btn-secondary text-xs px-3 py-2 min-h-[36px] inline-flex items-center gap-1"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-taupe text-xs">
              <span className="text-charcoal/60">
                Page {meta.page} of {meta.totalPages} ({meta.total} bookings)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn-secondary px-3 py-1.5 min-h-[36px] disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  className="btn-secondary px-3 py-1.5 min-h-[36px] disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
