import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/currency';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { Search, Calendar, X, Edit, Eye, CheckCircle2 } from 'lucide-react';
import PaymentBadge from '../../components/PaymentBadge';

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

export default function AdminBookings() {
  useDocumentTitle('Bookings Management');
  const queryClient = useQueryClient();

  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  // Detail and Modify Modals
  const [detailBooking, setDetailBooking] = useState(null);
  const [modifyBooking, setModifyBooking] = useState(null);
  const [modifyCheckIn, setModifyCheckIn] = useState('');
  const [modifyCheckOut, setModifyCheckOut] = useState('');
  const [modifyGuests, setModifyGuests] = useState(1);

  // Fetch rooms for room filter
  const { data: roomsData } = useQuery({
    queryKey: ['admin', 'rooms', 'dropdown'],
    queryFn: async () => {
      const response = await api.get('/admin/rooms?limit=100');
      return response.data?.data || [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'bookings', status, paymentStatus, search, selectedRoom, fromDate, toDate, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });
      if (status) params.append('status', status);
      if (paymentStatus) params.append('paymentStatus', paymentStatus);
      if (search) params.append('search', search);
      if (selectedRoom) params.append('room', selectedRoom);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);

      const response = await api.get(`/admin/bookings?${params}`);
      return response.data;
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/bookings/${id}`),
    onSuccess: () => {
      toast.success('Booking cancelled successfully (admin override)');
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'occupancy'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to cancel booking');
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: (id) => api.post(`/admin/bookings/${id}/mark-paid`),
    onSuccess: () => {
      toast.success('Booking marked as paid at hotel successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
      if (detailBooking) {
        setDetailBooking((prev) => ({ ...prev, paymentStatus: 'paid' }));
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to mark booking as paid');
    },
  });

  const modifyBookingMutation = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/bookings/${id}`, payload),
    onSuccess: () => {
      toast.success('Booking modified successfully');
      setModifyBooking(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'occupancy'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to modify booking');
    },
  });

  const handleCancel = (bookingId, reference) => {
    if (window.confirm(`Cancel booking ${reference}? This will immediately release reserved room nights.`)) {
      cancelBookingMutation.mutate(bookingId);
    }
  };

  const handleOpenModify = (booking) => {
    setModifyBooking(booking);
    setModifyCheckIn(new Date(booking.checkIn).toISOString().split('T')[0]);
    setModifyCheckOut(new Date(booking.checkOut).toISOString().split('T')[0]);
    setModifyGuests(booking.guests);
  };

  const handleSaveModify = (e) => {
    e.preventDefault();
    if (!modifyBooking) return;
    modifyBookingMutation.mutate({
      id: modifyBooking.id,
      payload: {
        checkIn: modifyCheckIn,
        checkOut: modifyCheckOut,
        guests: Number(modifyGuests),
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Reservations & Bookings</h1>
        <p className="text-sm text-charcoal/60">
          Manage guest bookings, modify reservation dates, and review payment status
        </p>
      </div>

      {/* Filter / Search Bar */}
      <div className="card p-4 sm:p-5 space-y-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2 text-xs border-b border-taupe pb-3">
          {[
            { label: 'All Statuses', value: '' },
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
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                status === tab.value
                  ? 'bg-forest text-ivory shadow-xs'
                  : 'bg-taupe-100 text-charcoal hover:bg-taupe-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40" />
            <input
              type="text"
              placeholder="Search reference or guest..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input pl-9 text-xs sm:text-sm"
            />
          </div>

          {/* Payment Status Dropdown */}
          <div className="relative">
            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                setPage(1);
              }}
              className="input text-xs sm:text-sm"
            >
              <option value="">All Payments</option>
              <option value="paid">Paid</option>
              <option value="pay_at_hotel">Pay at Hotel</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Room filter */}
          <div className="relative">
            <select
              value={selectedRoom}
              onChange={(e) => {
                setSelectedRoom(e.target.value);
                setPage(1);
              }}
              className="input text-xs sm:text-sm"
            >
              <option value="">All Rooms</option>
              {(roomsData || []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date from */}
          <div className="relative">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="input text-xs sm:text-sm"
              title="Check-in on or after"
            />
          </div>

          {/* Date to */}
          <div className="relative">
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="input text-xs sm:text-sm"
              title="Check-in on or before"
            />
          </div>
        </div>

        {(search || paymentStatus || selectedRoom || fromDate || toDate) && (
          <div className="flex items-center justify-between text-xs text-charcoal/60 pt-2">
            <span>Filtered results active</span>
            <button
              onClick={() => {
                setSearch('');
                setPaymentStatus('');
                setSelectedRoom('');
                setFromDate('');
                setToDate('');
                setStatus('');
                setPage(1);
              }}
              className="text-forest hover:underline font-semibold cursor-pointer"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Bookings Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse flex items-center justify-between">
              <div className="space-y-2 w-1/3">
                <div className="h-4 bg-taupe/40 rounded w-full"></div>
                <div className="h-3 bg-taupe/20 rounded w-1/2"></div>
              </div>
              <div className="h-8 bg-taupe/40 rounded w-24"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-taupe-50 text-charcoal/70 font-semibold border-b border-taupe">
                  <th className="p-4 sm:p-5 sticky left-0 bg-taupe-50 z-10 min-w-[140px]">Reference</th>
                  <th className="p-4 sm:p-5 min-w-[180px]">Guest</th>
                  <th className="p-4 sm:p-5 min-w-[160px]">Room</th>
                  <th className="p-4 sm:p-5 whitespace-nowrap">Dates</th>
                  <th className="p-4 sm:p-5">Status</th>
                  <th className="p-4 sm:p-5">Payment</th>
                  <th className="p-4 sm:p-5">Amount</th>
                  <th className="p-4 sm:p-5 text-right min-w-[200px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-taupe">
                {(data?.data || []).map((booking) => (
                  <tr key={booking.id} className="hover:bg-taupe-50/70 transition-colors">
                    <td className="p-4 sm:p-5 sticky left-0 bg-white z-10 font-mono font-semibold text-charcoal border-r sm:border-r-0 border-taupe">
                      {booking.reference}
                    </td>
                    <td className="p-4 sm:p-5">
                      <p className="font-semibold text-charcoal">{booking.guest?.name || 'Guest'}</p>
                      <p className="text-xs text-charcoal/50 truncate">{booking.guest?.email}</p>
                    </td>
                    <td className="p-4 sm:p-5 font-medium text-charcoal">
                      {booking.room?.name || 'Room'}
                    </td>
                    <td className="p-4 sm:p-5 text-xs text-charcoal/70 whitespace-nowrap">
                      {format(new Date(booking.checkIn), 'MMM d, yyyy')} &rarr; {format(new Date(booking.checkOut), 'MMM d, yyyy')}
                    </td>
                    <td className="p-4 sm:p-5 whitespace-nowrap">
                      <span className={statusColors[booking.status] || 'badge-taupe'}>
                        {statusLabels[booking.status] || booking.status}
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <PaymentBadge status={booking.paymentStatus} />
                        <span className="text-[10px] text-charcoal/50 capitalize font-medium">
                          {booking.paymentMethod === 'online' ? 'Online' : 'Pay at Hotel'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 font-bold text-charcoal whitespace-nowrap">
                      {formatCurrency(booking.totalPrice)}
                    </td>
                    <td className="p-4 sm:p-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {booking.paymentStatus === 'pay_at_hotel' && booking.status !== 'cancelled' && (
                          <button
                            onClick={() => markPaidMutation.mutate(booking.id)}
                            disabled={markPaidMutation.isPending}
                            className="btn-forest text-xs px-2.5 py-1.5 min-h-[36px]"
                            title="Mark pay-at-hotel booking as paid at front desk"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Mark Paid
                          </button>
                        )}
                        <button
                          onClick={() => setDetailBooking(booking)}
                          className="btn-secondary text-xs px-2.5 py-1.5 min-h-[36px]"
                          title="View booking details"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </button>
                        {booking.status !== 'cancelled' && (
                          <>
                            <button
                              onClick={() => handleOpenModify(booking)}
                              className="btn-outline text-xs px-2.5 py-1.5 min-h-[36px]"
                              title="Modify booking"
                            >
                              <Edit className="w-3.5 h-3.5 mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleCancel(booking.id, booking.reference)}
                              disabled={cancelBookingMutation.isPending}
                              className="btn-danger text-xs px-2.5 py-1.5 min-h-[36px]"
                              title="Cancel booking (admin bypasses 48h limit)"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(!data?.data || data.data.length === 0) && (
              <div className="text-center py-12 px-4">
                <Calendar className="w-10 h-10 text-charcoal/30 mx-auto mb-3" />
                <p className="text-charcoal font-semibold">No bookings found</p>
                <p className="text-xs text-charcoal/50 mt-1">Adjust filters or search criteria above</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {data?.meta && data.meta.totalPages > 1 && (
            <div className="p-4 sm:p-5 border-t border-taupe flex items-center justify-between text-xs sm:text-sm text-charcoal/60">
              <div>
                Showing page <span className="font-semibold text-charcoal">{data.meta.page}</span> of{' '}
                <span className="font-semibold text-charcoal">{data.meta.totalPages}</span> ({data.meta.total} total)
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={data.meta.page <= 1}
                  className="btn-secondary text-xs px-3 py-1.5 min-h-[36px] disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                  disabled={data.meta.page >= data.meta.totalPages}
                  className="btn-secondary text-xs px-3 py-1.5 min-h-[36px] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Booking Details Modal */}
      {detailBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-taupe w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-taupe">
              <div>
                <h3 className="font-bold text-charcoal text-lg">Booking Details</h3>
                <p className="text-xs font-mono text-forest font-semibold">{detailBooking.reference}</p>
              </div>
              <button
                onClick={() => setDetailBooking(null)}
                className="w-8 h-8 rounded-lg text-charcoal/40 hover:text-charcoal flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-charcoal/50">Guest Name</p>
                  <p className="font-semibold text-charcoal">{detailBooking.guest?.name || 'Guest'}</p>
                </div>
                <div>
                  <p className="text-xs text-charcoal/50">Email Address</p>
                  <p className="font-semibold text-charcoal truncate">{detailBooking.guest?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-charcoal/50">Room</p>
                  <p className="font-semibold text-charcoal">{detailBooking.room?.name || 'Room'}</p>
                </div>
                <div>
                  <p className="text-xs text-charcoal/50">Party Size</p>
                  <p className="font-semibold text-charcoal">{detailBooking.guests} guests</p>
                </div>
                <div>
                  <p className="text-xs text-charcoal/50">Check-In</p>
                  <p className="font-semibold text-charcoal">{format(new Date(detailBooking.checkIn), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-xs text-charcoal/50">Check-Out</p>
                  <p className="font-semibold text-charcoal">{format(new Date(detailBooking.checkOut), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-xs text-charcoal/50">Booking Status</p>
                  <span className={statusColors[detailBooking.status] || 'badge-taupe'}>
                    {statusLabels[detailBooking.status] || detailBooking.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-charcoal/50">Payment Status</p>
                  <PaymentBadge status={detailBooking.paymentStatus} />
                </div>
                <div>
                  <p className="text-xs text-charcoal/50">Payment Method</p>
                  <p className="font-semibold text-charcoal capitalize">
                    {detailBooking.paymentMethod === 'online' ? 'Online Gateway' : 'Pay at Hotel'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-charcoal/50">Total Price</p>
                  <p className="font-bold text-forest">{formatCurrency(detailBooking.totalPrice)}</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-taupe-50 border-t border-taupe flex items-center justify-between">
              <div className="flex items-center gap-2">
                {detailBooking.paymentStatus === 'pay_at_hotel' && detailBooking.status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => markPaidMutation.mutate(detailBooking.id)}
                    disabled={markPaidMutation.isPending}
                    className="btn-forest text-xs px-3 py-2 min-h-[36px]"
                  >
                    Mark Paid
                  </button>
                )}
                {detailBooking.status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleCancel(detailBooking.id, detailBooking.reference);
                      setDetailBooking(null);
                    }}
                    disabled={cancelBookingMutation.isPending}
                    className="btn-danger text-xs px-3 py-2 min-h-[36px]"
                  >
                    Cancel Reservation
                  </button>
                )}
              </div>
              <button onClick={() => setDetailBooking(null)} className="btn-secondary text-xs px-4 py-2">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modify Booking Modal */}
      {modifyBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-taupe w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-taupe">
              <div>
                <h3 className="font-bold text-charcoal">Modify Reservation</h3>
                <p className="text-xs font-mono text-forest">{modifyBooking.reference}</p>
              </div>
              <button
                onClick={() => setModifyBooking(null)}
                className="w-8 h-8 rounded-lg text-charcoal/40 hover:text-charcoal flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveModify} className="p-5 space-y-4">
              <div>
                <label className="label">Check-in Date</label>
                <input
                  type="date"
                  value={modifyCheckIn}
                  onChange={(e) => setModifyCheckIn(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Check-out Date</label>
                <input
                  type="date"
                  value={modifyCheckOut}
                  onChange={(e) => setModifyCheckOut(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Number of Guests</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={modifyGuests}
                  onChange={(e) => setModifyGuests(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div className="pt-3 border-t border-taupe flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModifyBooking(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modifyBookingMutation.isPending}
                  className="btn-primary"
                >
                  {modifyBookingMutation.isPending ? 'Saving...' : 'Update Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
