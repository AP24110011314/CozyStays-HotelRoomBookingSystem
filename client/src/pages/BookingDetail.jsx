import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import { ChevronLeft, Calendar, Users, X, Edit3, Trash2, Mail, ShieldAlert } from 'lucide-react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { formatINR } from '../utils/currency';
import DateRangePicker from '../components/DateRangePicker';
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

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);
  const [newCheckIn, setNewCheckIn] = useState('');
  const [newCheckOut, setNewCheckOut] = useState('');

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const response = await api.get(`/bookings/${id}`);
      return response.data.data;
    },
  });

  useDocumentTitle(booking ? `Booking ${booking.reference}` : 'Booking Details');

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete(`/bookings/${id}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Booking cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to cancel booking');
    },
  });

  const modifyMutation = useMutation({
    mutationFn: async () => {
      const response = await api.patch(`/bookings/${id}`, {
        checkIn: newCheckIn,
        checkOut: newCheckOut,
      });
      return response.data.data;
    },
    onSuccess: () => {
      toast.success('Booking dates modified successfully');
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setIsModifyModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to modify booking dates');
    },
  });

  const handleOpenModify = () => {
    if (!booking) return;
    setNewCheckIn(booking.checkIn);
    setNewCheckOut(booking.checkOut);
    setIsModifyModalOpen(true);
  };

  const handleCancel = () => {
    if (!booking) return;
    if (window.confirm(`Are you sure you want to cancel booking ${booking.reference}?`)) {
      cancelMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="h-72 bg-slate-200 rounded-3xl"></div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Booking not found</h2>
        <p className="text-slate-500 text-sm">We couldn&apos;t retrieve this reservation details.</p>
        <button
          onClick={() => navigate('/bookings')}
          className="btn-primary inline-flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to My Bookings
        </button>
      </div>
    );
  }

  const nights = differenceInDays(new Date(booking.checkOut), new Date(booking.checkIn)) || 1;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top back navigation */}
      <div>
        <Link
          to="/bookings"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200/80 hover:bg-slate-50 transition-colors min-h-[44px]"
        >
          <ChevronLeft className="w-4 h-4 text-indigo-600" />
          Back to My Bookings
        </Link>
      </div>

      {/* Main Booking Card */}
      <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-md">
        {/* Header with image */}
        <div className="relative aspect-[16/9] sm:aspect-[21/9] bg-slate-100 overflow-hidden">
          {booking.room?.photos?.[0] ? (
            <img
              src={booking.room.photos[0]}
              alt={booking.room.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              No image available
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent"></div>

          <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3 text-white">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="badge-indigo px-3 py-1 text-xs font-bold uppercase backdrop-blur-md">
                  {booking.room?.type}
                </span>
                <span className={`${statusColors[booking.status]} px-3 py-1 text-xs font-bold uppercase shadow-sm`}>
                  {statusLabels[booking.status]}
                </span>
              </div>
              <h1 className="text-xl sm:text-3xl font-extrabold">{booking.room?.name}</h1>
            </div>

            <div className="text-left sm:text-right bg-black/30 backdrop-blur-md px-3 py-2 rounded-xl">
              <span className="text-[11px] text-slate-300 font-medium block">Reference Code</span>
              <span className="font-mono text-base font-bold text-white tracking-wider">
                {booking.reference}
              </span>
            </div>
          </div>
        </div>

        {/* Details & Actions Section */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Stay Details & Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stay Details */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Stay Details
              </h3>
              <div className="space-y-2 text-xs divide-y divide-slate-200/60">
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Check-in</span>
                  <span className="font-bold text-slate-900">{format(new Date(booking.checkIn), 'EEEE, MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Check-out</span>
                  <span className="font-bold text-slate-900">{format(new Date(booking.checkOut), 'EEEE, MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-bold text-indigo-700">{nights} night{nights !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Guests</span>
                  <span className="font-bold text-slate-900">{booking.guests} guest{booking.guests !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            {/* Pricing Details */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Payment Summary
              </h3>
              <div className="space-y-2 text-xs divide-y divide-slate-200/60">
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Rate per night</span>
                  <span className="font-bold text-slate-900">{formatINR(booking.room?.basePrice)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Nights</span>
                  <span className="font-bold text-slate-900">{nights}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Taxes & Fees</span>
                  <span className="font-semibold text-emerald-600">Included</span>
                </div>
                <div className="flex justify-between py-2 border-t border-slate-300">
                  <span className="font-bold text-slate-900 text-sm">Total Paid</span>
                  <span className="font-extrabold text-indigo-600 text-lg">{formatINR(booking.totalPrice)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Email dispatch note */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900">
            <Mail className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <p>
              Booking details, modification updates, and calendar .ics invites are automatically sent to your registered email.
            </p>
          </div>

          {/* Actions: Modify & Cancel (if eligible) */}
          {booking.status !== 'cancelled' && booking.status !== 'completed' && (
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleOpenModify}
                className="btn-secondary flex-1 justify-center py-3 text-sm min-h-[48px] inline-flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4 text-indigo-600" />
                Modify Stay Dates
              </button>

              {booking.canCancel ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending}
                  className="btn-danger flex-1 justify-center py-3 text-sm min-h-[48px] inline-flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
                </button>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex-1">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>Cancellation window has closed (must be made at least 48 hours prior to check-in).</span>
                </div>
              )}
            </div>
          )}

          {booking.status === 'cancelled' && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-center text-xs text-rose-700">
              This reservation was cancelled. All reserved room nights have been released back to availability.
            </div>
          )}
        </div>
      </div>

      {/* Modify Dates Modal / Bottom Sheet */}
      {isModifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                Modify Reservation Dates
              </h3>
              <button
                type="button"
                onClick={() => setIsModifyModalOpen(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select new check-in and check-out dates for room <strong>{booking.room?.name}</strong>. The system will atomically claim new nights before releasing current ones.
            </p>

            <DateRangePicker
              checkIn={newCheckIn}
              checkOut={newCheckOut}
              onChange={(ci, co) => {
                setNewCheckIn(ci);
                setNewCheckOut(co);
              }}
            />

            <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="text-slate-500 font-medium">New Duration</span>
              <span className="font-bold text-indigo-700">
                {newCheckIn && newCheckOut
                  ? `${Math.max(1, differenceInDays(new Date(newCheckOut), new Date(newCheckIn)))} night(s)`
                  : 'Select dates'}
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsModifyModalOpen(false)}
                className="btn-secondary flex-1 justify-center py-3 text-sm min-h-[48px]"
              >
                Keep Current Dates
              </button>
              <button
                type="button"
                onClick={() => modifyMutation.mutate()}
                disabled={modifyMutation.isPending || !newCheckIn || !newCheckOut}
                className="btn-primary flex-1 justify-center py-3 text-sm min-h-[48px]"
              >
                {modifyMutation.isPending ? 'Updating...' : 'Save New Dates'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}