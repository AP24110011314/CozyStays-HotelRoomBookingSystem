import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/currency';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import PaymentBadge from '../../components/PaymentBadge';
import { CreditCard, RotateCcw, X, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminPayments() {
  useDocumentTitle('Payments Management');
  const queryClient = useQueryClient();

  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  // Refund Modal State
  const [refundPayment, setRefundPayment] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'payments', status, fromDate, toDate, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });
      if (status) params.append('status', status);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);

      const response = await api.get(`/admin/payments?${params}`);
      return response.data;
    },
  });

  const refundMutation = useMutation({
    mutationFn: ({ id, amount, reason }) =>
      api.post(`/admin/payments/${id}/refund`, {
        amount: amount ? Math.round(Number(amount) * 100) : undefined,
        reason,
      }),
    onSuccess: () => {
      toast.success('Refund processed successfully');
      setRefundPayment(null);
      setRefundAmount('');
      setRefundReason('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to process refund');
    },
  });

  const handleOpenRefund = (payment) => {
    setRefundPayment(payment);
    const maxRefundRupees = (payment.amount - (payment.refundedAmount || 0)) / 100;
    setRefundAmount(maxRefundRupees.toString());
    setRefundReason('Customer requested cancellation / refund');
  };

  const handleProcessRefund = (e) => {
    e.preventDefault();
    if (!refundPayment) return;
    refundMutation.mutate({
      id: refundPayment.id,
      amount: refundAmount,
      reason: refundReason,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payment Transactions</h1>
        <p className="text-sm text-slate-500">
          Track transaction histories, audit payment provider records, and manage refunds
        </p>
      </div>

      {/* Filter Tabs & Date Range */}
      <div className="card p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap gap-2 text-xs border-b border-slate-100 pb-3">
          {[
            { label: 'All Transactions', value: '' },
            { label: 'Paid', value: 'paid' },
            { label: 'Pay at Hotel', value: 'pay_at_hotel' },
            { label: 'Pending', value: 'pending' },
            { label: 'Refunded', value: 'refunded' },
            { label: 'Failed', value: 'failed' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                status === tab.value
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="input text-xs sm:text-sm"
            title="Transactions on or after"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="input text-xs sm:text-sm"
            title="Transactions on or before"
          />
          {(status || fromDate || toDate) && (
            <button
              onClick={() => {
                setStatus('');
                setFromDate('');
                setToDate('');
                setPage(1);
              }}
              className="btn-secondary text-xs"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse h-16"></div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/80">
                  <th className="p-4 sm:p-5">Booking Ref</th>
                  <th className="p-4 sm:p-5">Customer</th>
                  <th className="p-4 sm:p-5">Method / Provider</th>
                  <th className="p-4 sm:p-5">Status</th>
                  <th className="p-4 sm:p-5">Amount</th>
                  <th className="p-4 sm:p-5">Date</th>
                  <th className="p-4 sm:p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.data || []).map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 sm:p-5 font-mono font-semibold text-slate-900">
                      {payment.bookingReference || payment.bookingId}
                    </td>
                    <td className="p-4 sm:p-5">
                      <p className="font-semibold text-slate-900">{payment.user?.name || 'Guest'}</p>
                      <p className="text-xs text-slate-400">{payment.user?.email}</p>
                    </td>
                    <td className="p-4 sm:p-5 text-xs">
                      <p className="font-semibold text-slate-800 capitalize">
                        {payment.method === 'online' ? 'Online' : 'Pay at Hotel'}
                      </p>
                      <p className="text-slate-400 font-mono text-[11px]">
                        {payment.provider ? `(${payment.provider})` : '—'}
                      </p>
                    </td>
                    <td className="p-4 sm:p-5">
                      <PaymentBadge status={payment.status} />
                    </td>
                    <td className="p-4 sm:p-5 font-bold text-slate-900">
                      {formatCurrency(payment.amount / 100, payment.currency)}
                      {payment.refundedAmount > 0 && (
                        <p className="text-[11px] text-purple-600 font-normal">
                          Refunded: {formatCurrency(payment.refundedAmount / 100, payment.currency)}
                        </p>
                      )}
                    </td>
                    <td className="p-4 sm:p-5 text-xs text-slate-600 whitespace-nowrap">
                      {format(new Date(payment.createdAt), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="p-4 sm:p-5 text-right whitespace-nowrap">
                      {payment.status === 'paid' && payment.amount > (payment.refundedAmount || 0) && (
                        <button
                          onClick={() => handleOpenRefund(payment)}
                          className="btn-outline text-xs px-2.5 py-1.5 min-h-[36px] inline-flex items-center gap-1"
                          title="Issue refund to customer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Refund</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(!data?.data || data.data.length === 0) && (
              <div className="text-center py-12 px-4">
                <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-700 font-semibold">No transactions found</p>
                <p className="text-xs text-slate-400 mt-1">Adjust filters above</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {data?.meta && data.meta.totalPages > 1 && (
            <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm text-slate-500">
              <div>
                Showing page <span className="font-semibold text-slate-800">{data.meta.page}</span> of{' '}
                <span className="font-semibold text-slate-800">{data.meta.totalPages}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={data.meta.page <= 1}
                  className="btn-secondary text-xs px-3 py-1.5 min-h-[36px] disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                  disabled={data.meta.page >= data.meta.totalPages}
                  className="btn-secondary text-xs px-3 py-1.5 min-h-[36px] disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Refund Modal */}
      {refundPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900">Process Refund</h3>
                <p className="text-xs font-mono text-indigo-600">{refundPayment.bookingReference}</p>
              </div>
              <button
                onClick={() => setRefundPayment(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleProcessRefund} className="p-5 space-y-4">
              <div>
                <label className="label">Refund Amount ({refundPayment.currency})</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max={(refundPayment.amount - (refundPayment.refundedAmount || 0)) / 100}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="input"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">
                  Maximum refundable: {formatCurrency((refundPayment.amount - (refundPayment.refundedAmount || 0)) / 100, refundPayment.currency)}
                </p>
              </div>

              <div>
                <label className="label">Reason for Refund</label>
                <textarea
                  rows={2}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  This action will immediately communicate with the payment provider to credit the guest.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRefundPayment(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refundMutation.isPending}
                  className="btn-primary"
                >
                  {refundMutation.isPending ? 'Refunding...' : 'Confirm Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

