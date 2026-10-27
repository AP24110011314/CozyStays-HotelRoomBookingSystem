import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../api/client';
import toast from 'react-hot-toast';

const bookingSchema = z.object({
  guests: z.number().min(1, 'At least 1 guest required'),
});

export default function BookingCreate() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const checkIn = searchParams.get('checkIn') || format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
  const checkOut = searchParams.get('checkOut') || format(new Date(Date.now() + 2 * 86400000), 'yyyy-MM-dd');
  const nights = differenceInDays(new Date(checkOut), new Date(checkIn));

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
      navigate(`/bookings/${booking.id}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Booking failed');
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="card p-6 space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-gray-600">Room not found</p>
      </div>
    );
  }

  const totalPrice = room.basePrice * nights;
  const maxGuests = room.maxGuests;

  const onSubmit = (data) => {
    createBookingMutation.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Complete Your Booking</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Guest Details</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label htmlFor="guests" className="label">Number of Guests</label>
                <select
                  id="guests"
                  {...register('guests', { valueAsNumber: true })}
                  className="input"
                >
                  {[...Array(maxGuests)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} Guest{i + 1 !== 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
                {errors.guests && (
                  <p className="mt-1 text-sm text-red-600">{errors.guests.message}</p>
                )}
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="font-semibold text-gray-900 mb-4">Stay Details</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Check-in</dt>
                    <dd className="font-medium">{format(new Date(checkIn), 'MMM d, yyyy')}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Check-out</dt>
                    <dd className="font-medium">{format(new Date(checkOut), 'MMM d, yyyy')}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Nights</dt>
                    <dd className="font-medium">{nights}</dd>
                  </div>
                </dl>
              </div>

              <button
                type="submit"
                disabled={createBookingMutation.isPending}
                className="btn-primary w-full"
              >
                {createBookingMutation.isPending ? 'Confirming...' : 'Confirm Booking'}
              </button>
            </form>
          </div>
        </div>

        <div>
          <div className="card p-6 sticky top-24">
            <h3 className="font-semibold text-gray-900 mb-4">Booking Summary</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">{room.name}</dt>
                <dd className="font-medium">${(room.basePrice / 100).toFixed(2)}/night</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">{nights} night{nights !== 1 ? 's' : ''}</dt>
                <dd className="font-medium">${((room.basePrice * nights) / 100).toFixed(2)}</dd>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between">
                <dt className="text-lg font-semibold text-gray-900">Total</dt>
                <dd className="text-lg font-bold text-indigo-600">${(totalPrice / 100).toFixed(2)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-gray-500">
              Price includes all taxes and fees. Cancellation policy applies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}