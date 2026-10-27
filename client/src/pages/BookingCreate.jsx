import { useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, ChevronLeft, Calendar, Users, ShieldCheck, Mail, ArrowRight } from 'lucide-react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { formatINR } from '../utils/currency';
import useDocumentTitle from '../hooks/useDocumentTitle';

const bookingSchema = z.object({
  guests: z.number().min(1, 'At least 1 guest required'),
});

export default function BookingCreate() {
  useDocumentTitle('Complete Booking');
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const checkIn = searchParams.get('checkIn') || format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
  const checkOut = searchParams.get('checkOut') || format(new Date(Date.now() + 2 * 86400000), 'yyyy-MM-dd');
  const nights = Math.max(1, differenceInDays(new Date(checkOut), new Date(checkIn)) || 1);

  const { data: room, isLoading } = useQuery({
    queryKey: ['room', id],
    queryFn: async () => {
      const response = await api.get(`/rooms/${id}`);
      return response.data.data;
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(bookingSchema),
    defaultValues: { guests: 1 },
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/bookings', {
        roomId: id,
        checkIn,
        checkOut,
        guests: data.guests,
      });
      return response.data.data;
    },
    onSuccess: (booking) => {
      toast.success(`Booking confirmed! Reference: ${booking.reference}`);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setConfirmedBooking(booking);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Booking failed');
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="h-64 bg-slate-200 rounded-3xl"></div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Room not found</h2>
        <Link to="/" className="btn-primary mt-4 inline-flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" />
          Back to rooms
        </Link>
      </div>
    );
  }

  const totalPrice = room.basePrice * nights;
  const maxGuests = room.maxGuests || 2;

  const onSubmit = (data) => {
    createBookingMutation.mutate(data);
  };

  // Booking Confirmation View
  if (confirmedBooking) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-lg text-center space-y-6 animate-fadeIn">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Booking Confirmed!
          </h1>
          <p className="text-slate-600 text-sm">
            Your reservation has been successfully booked in our cloud database.
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 sm:p-6 border border-slate-200/80 text-left space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Booking Reference</span>
            <span className="font-mono text-base font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
              {confirmedBooking.reference}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-500 font-medium">Room</p>
              <p className="font-bold text-slate-900 text-sm">{room.name}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Total Paid</p>
              <p className="font-bold text-indigo-600 text-sm">{formatINR(confirmedBooking.totalPrice || totalPrice)}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Check-in</p>
              <p className="font-semibold text-slate-800">{format(new Date(checkIn), 'EEE, MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Check-out</p>
              <p className="font-semibold text-slate-800">{format(new Date(checkOut), 'EEE, MMM d, yyyy')}</p>
            </div>
          </div>
        </div>

        {/* Confirmation Email Alert */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-left text-xs text-indigo-900">
          <Mail className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <p className="leading-relaxed">
            A confirmation email with your booking details and a calendar invite (.ics) has been dispatched to your email address!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(`/bookings/${confirmedBooking.id}`)}
            className="btn-primary flex-1 justify-center py-3 text-sm min-h-[48px]"
          >
            View Booking Details
          </button>
          <Link
            to="/bookings"
            className="btn-secondary flex-1 justify-center py-3 text-sm min-h-[48px] inline-flex items-center gap-2"
          >
            My Bookings
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          to={`/rooms/${id}?checkIn=${checkIn}&checkOut=${checkOut}`}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200/80 hover:bg-slate-50 transition-colors min-h-[44px]"
        >
          <ChevronLeft className="w-4 h-4 text-indigo-600" />
          Back to Room Details
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Confirm Your Reservation</h1>
        <p className="text-xs sm:text-sm text-slate-500">Review your stay details and finalize your booking</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Guest Details Form */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <Users className="w-4 h-4 text-indigo-600" />
            Guest Information
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="guests" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Number of Guests
              </label>
              <select
                id="guests"
                {...register('guests', { valueAsNumber: true })}
                className="w-full text-base rounded-2xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 py-3 px-4 min-h-[48px]"
              >
                {[...Array(maxGuests)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} Guest{i + 1 !== 1 ? 's' : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">Maximum {maxGuests} guests allowed for this room.</p>
              {errors.guests && (
                <p className="text-xs text-rose-600 font-medium" role="alert">
                  {errors.guests.message}
                </p>
              )}
            </div>

            {/* Stay Details summary */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                Stay Dates
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Check-in</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {format(new Date(checkIn), 'EEE, MMM d, yyyy')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Check-out</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {format(new Date(checkOut), 'EEE, MMM d, yyyy')}
                  </span>
                </div>
              </div>
              <p className="text-xs text-indigo-700 font-semibold pt-1">
                Total duration: {nights} night{nights !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Free cancellation up to 48 hours prior to check-in. Instant confirmation.</span>
            </div>

            <button
              type="submit"
              disabled={createBookingMutation.isPending}
              className="btn-primary w-full justify-center py-4 text-base font-bold shadow-md min-h-[52px]"
            >
              {createBookingMutation.isPending ? 'Confirming Reservation...' : 'Complete Reservation'}
            </button>
          </form>
        </div>

        {/* Right Summary Sidebar */}
        <aside className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 sticky top-28">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100">
            {room.photos?.[0] ? (
              <img src={room.photos[0]} alt={room.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                No photo
              </div>
            )}
          </div>

          <div>
            <span className="badge-indigo px-2.5 py-0.5 text-[11px] font-semibold uppercase">
              {room.type}
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1">{room.name}</h3>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Rate per night</span>
              <span className="font-semibold text-slate-800">{formatINR(room.basePrice)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Nights</span>
              <span className="font-semibold text-slate-800">{nights}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Taxes & fees</span>
              <span className="font-semibold text-emerald-600">Included</span>
            </div>
            <div className="border-t border-slate-100 pt-2 flex justify-between items-baseline">
              <span className="text-sm font-bold text-slate-900">Total Price</span>
              <span className="text-xl font-extrabold text-indigo-600">{formatINR(totalPrice)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}