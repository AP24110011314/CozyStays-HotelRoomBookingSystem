import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { differenceInDays } from 'date-fns';
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

export default function BookingDetail() {
  const { id } = useParams();

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const response = await api.get(`/bookings/${id}`);
      return response.data.data;
    },
  });

  const cancelBooking = async () => {
    if (!window.confirm(`Are you sure you want to cancel booking ${booking.reference}?`)) return;
    try {
      await api.delete(`/bookings/${id}`);
      toast.success('Booking cancelled');
      window.location.href = '/bookings';
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to cancel booking');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="card p-6 space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <p className="text-gray-600">Booking not found</p>
        <Link to="/bookings" className="text-indigo-600 hover:text-indigo-500 mt-4 inline-block">Back to bookings</Link>
      </div>
    );
  }

  const nights = differenceInDays(new Date(booking.checkOut), new Date(booking.checkIn));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Link to="/bookings" className="text-indigo-600 hover:text-indigo-500 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to bookings
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{booking.room?.name}</h1>
              <span className={`${statusColors[booking.status]}`}>
                {statusLabels[booking.status]}
              </span>
            </div>
            <p className="text-gray-600">{booking.room?.type} • {booking.guests} guest{booking.guests !== 1 ? 's' : ''}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Reference</p>
            <p className="font-mono font-semibold text-gray-900">{booking.reference}</p>
          </div>
        </div>

        <div className="p-6 grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Stay Details</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">Check-in</dt>
                <dd className="font-medium">{format(new Date(booking.checkIn), 'EEEE, MMMM d, yyyy')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Check-out</dt>
                <dd className="font-medium">{format(new Date(booking.checkOut), 'EEEE, MMMM d, yyyy')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Nights</dt>
                <dd className="font-medium">{nights}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Pricing</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">Rate per night</dt>
                <dd className="font-medium">${(booking.room?.basePrice / 100).toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Nights</dt>
                <dd className="font-medium">{nights}</dd>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between">
                <dt className="text-lg font-semibold text-gray-900">Total</dt>
                <dd className="text-lg font-bold text-indigo-600">${(booking.totalPrice / 100).toFixed(2)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {booking.status !== 'cancelled' && booking.status !== 'completed' && booking.canCancel && (
          <div className="p-6 border-t border-gray-100 bg-gray-50">
            <button
              onClick={cancelBooking}
              className="btn-danger w-full"
            >
              Cancel Booking
            </button>
            <p className="mt-2 text-center text-sm text-gray-600">
              Cancellations must be made at least 48 hours before check-in.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}