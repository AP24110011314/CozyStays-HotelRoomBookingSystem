import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import {
  ChevronLeft,
  Calendar,
  Users,
  X,
  Edit3,
  Trash2,
  Mail,
  ShieldAlert,
  CreditCard,
  RotateCcw,
} from 'lucide-react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/currency';
import DateRangePicker from '../components/DateRangePicker';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useAuth } from '../contexts/AuthContext';
import PaymentBadge from '../components/PaymentBadge';
import HoldCountdown from '../components/HoldCountdown';
import PaymentModal from '../components/PaymentModal';

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

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);
  const [newCheckIn, setNewCheckIn] = useState('');
  const [newCheckOut, setNewCheckOut] = useState('');

  // Payment modal state
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payOrderData, setPayOrderData] = useState(null);

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
    onSuccess: (res) => {
      const msg = res.message || 'Booking cancelled successfully';
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to cancel booking');
    },
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/bookings/${id}/pay`);
      return response.data?.data;
    },
    onSuccess: (orderData) => {
      setPayOrderData(orderData);
      setIsPayModalOpen(true);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to initialize payment');
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

  const handlePaymentSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['booking', id] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    setIsPayModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-taupe/40 rounded w-1/4"></div>
        <div className="h-72 bg-taupe/40 rounded-3xl"></div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 bg-white rounded-3xl border border-taupe p-8 space-y-4">
        <h2 className="text-xl font-bold text-charcoal">Booking not found</h2>
        <p className="text-charcoal/60 text-sm">We couldn&apos;t retrieve this reservation details.</p>
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
  const isPendingPayment = booking.status === 'pending_payment';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top back navigation */}
      <div>
        <Link
          to="/bookings"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-charcoal bg-white border border-taupe hover:bg-taupe/30 transition-colors min-h-[44px]"
        >
          <ChevronLeft className="w-4 h-4 text-forest" />
          Back to My Bookings
        </Link>
      </div>

      {/* Main Booking Card */}
      <div className="bg-white rounded-3xl overflow-hidden border border-taupe shadow-md">
        {/* Header with image */}
        <div className="relative aspect-[16/9] sm:aspect-[21/9] bg-taupe-100 overflow-hidden">
          {booking.room?.photos?.[0] ? (
            <img
              src={booking.room.photos[0]}
              alt={booking.room.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-charcoal/40">
              No image available
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/30 to-transparent"></div>

          <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3 text-ivory">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="badge-forest px-3 py-1 text-xs font-bold uppercase backdrop-blur-md">
                  {booking.room?.type}
                </span>
                <span className={`${statusColors[booking.status] || 'badge-taupe'} px-3 py-1 text-xs font-bold uppercase shadow-xs`}>
                  {statusLabels[booking.status] || booking.status}
                </span>
                <PaymentBadge status={booking.paymentStatus} />
              </div>
              <h1 className="text-xl sm:text-3xl font-extrabold text-ivory">{booking.room?.name}</h1>
            </div>

            <div className="text-left sm:text-right bg-charcoal/50 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10">
              <span className="text-[11px] text-taupe-200 font-medium block">Reference Code</span>
              <span className="font-mono text-base font-bold text-ivory tracking-wider">
                {booking.reference}
              </span>
            </div>
          </div>
        </div>

        {/* Details & Actions Section */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Pending Payment Alert Banner with Countdown */}
          {isPendingPayment && (
            <div className="p-4 sm:p-5 rounded-2xl bg-brass-50 border border-brass-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-brass-700" />
                  <span className="font-bold text-sm text-charcoal">Room Held for Payment</span>
                </div>
                <p className="text-xs text-charcoal/80">
                  Your room dates are held exclusively for you. Please complete checkout before the timer expires.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {booking.holdExpiresAt && (
                  <HoldCountdown
                    expiresAt={booking.holdExpiresAt}
                    onExpire={() => queryClient.invalidateQueries({ queryKey: ['booking', id] })}
                  />
                )}
                <button
                  type="button"
                  onClick={() => payMutation.mutate()}
                  disabled={payMutation.isPending}
                  className="btn-primary text-xs py-2 px-4 whitespace-nowrap min-h-[40px]"
                >
                  {payMutation.isPending ? 'Opening...' : 'Complete Payment'}
                </button>
              </div>
            </div>
          )}

          {/* Refund Notice if Cancelled & Paid */}
          {booking.status === 'cancelled' && (booking.paymentStatus === 'refunded' || booking.paymentStatus === 'partially_refunded') && (
            <div className="p-4 rounded-2xl bg-taupe-100 border border-taupe flex items-start gap-3 text-xs text-charcoal">
              <RotateCcw className="w-4 h-4 text-forest flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Refund Processed</p>
                <p className="text-charcoal/70">
                  Payment for this reservation was refunded back to your original payment method.
                </p>
              </div>
            </div>
          )}

          {/* Stay Details & Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stay Details */}
            <div className="bg-taupe-50 rounded-2xl p-5 border border-taupe space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal flex items-center gap-2">
                <Calendar className="w-4 h-4 text-forest" />
                Stay Details
              </h3>
              <div className="space-y-2 text-xs divide-y divide-taupe">
                <div className="flex justify-between py-1.5">
                  <span className="text-charcoal/60">Check-in</span>
                  <span className="font-bold text-charcoal">{format(new Date(booking.checkIn), 'EEEE, MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-charcoal/60">Check-out</span>
                  <span className="font-bold text-charcoal">{format(new Date(booking.checkOut), 'EEEE, MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-charcoal/60">Duration</span>
                  <span className="font-bold text-forest">{nights} night{nights !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-charcoal/60">Guests</span>
                  <span className="font-bold text-charcoal">{booking.guests} guest{booking.guests !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            {/* Pricing Details */}
            <div className="bg-taupe-50 rounded-2xl p-5 border border-taupe space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal flex items-center gap-2">
                <Users className="w-4 h-4 text-forest" />
                Payment Summary
              </h3>
              <div className="space-y-2 text-xs divide-y divide-taupe">
                <div className="flex justify-between py-1.5">
                  <span className="text-charcoal/60">Rate per night</span>
                  <span className="font-bold text-charcoal">{formatCurrency(booking.room?.basePrice, currency)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-charcoal/60">Nights</span>
                  <span className="font-bold text-charcoal">{nights}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-charcoal/60">Payment Method</span>
                  <span className="font-semibold text-charcoal capitalize">
                    {booking.paymentMethod === 'online' ? 'Online Payment' : 'Pay at Hotel'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-charcoal/60">Payment Status</span>
                  <PaymentBadge status={booking.paymentStatus} />
                </div>
                <div className="flex justify-between py-2 border-t border-taupe-300">
                  <span className="font-bold text-charcoal text-sm">Total Amount</span>
                  <span className="font-extrabold text-forest text-lg">{formatCurrency(booking.totalPrice, currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Email dispatch note */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-forest-50 border border-forest-200 text-xs text-forest">
            <Mail className="w-4 h-4 text-forest flex-shrink-0" />
            <p>
              Booking details, modification updates, and calendar .ics invites are automatically sent to your registered email.
            </p>
          </div>

          {/* Actions: Modify & Cancel (if eligible) */}
          {booking.status !== 'cancelled' && booking.status !== 'completed' && booking.status !== 'expired' && (
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-taupe">
              <button
                type="button"
                onClick={handleOpenModify}
                className="btn-secondary flex-1 justify-center py-3 text-sm min-h-[48px] inline-flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4 text-forest" />
                Modify Stay Dates
              </button>

              {(isAdmin || booking.canCancel) ? (
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
                <div className="flex items-center gap-2 p-3 bg-brick-50 rounded-xl border border-brick-200 text-xs text-brick flex-1">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>Cancellation window has closed (must be made at least 48 hours prior to check-in).</span>
                </div>
              )}
            </div>
          )}

          {booking.status === 'cancelled' && (
            <div className="p-4 rounded-2xl bg-brick-50 border border-brick-200 text-center text-xs text-brick">
              This reservation was cancelled. All reserved room nights have been released back to availability.
            </div>
          )}

          {booking.status === 'expired' && (
            <div className="p-4 rounded-2xl bg-taupe-100 border border-taupe text-center text-xs text-charcoal">
              This booking hold expired because payment was not completed within 15 minutes. The room has been released.
            </div>
          )}
        </div>
      </div>

      {/* Modify Dates Modal / Bottom Sheet */}
      {isModifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-taupe space-y-6">
            <div className="flex items-center justify-between border-b border-taupe pb-3">
              <h3 className="font-bold text-lg text-charcoal flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-forest" />
                Modify Reservation Dates
              </h3>
              <button
                type="button"
                onClick={() => setIsModifyModalOpen(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-charcoal/40 hover:bg-taupe/30 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-charcoal/60">
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

            <div className="flex items-center justify-between text-xs bg-taupe-50 p-3 rounded-xl border border-taupe">
              <span className="text-charcoal/60 font-medium">New Duration</span>
              <span className="font-bold text-forest">
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

      {/* Payment Gateway Modal */}
      {isPayModalOpen && payOrderData && (
        <PaymentModal
          isOpen={isPayModalOpen}
          onClose={() => setIsPayModalOpen(false)}
          booking={booking}
          paymentData={payOrderData}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
