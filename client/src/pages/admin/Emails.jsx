import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../api/client';
import toast from 'react-hot-toast';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const statusLabels = {
  pending: 'Pending',
  sending: 'Sending',
  sent: 'Sent',
  failed: 'Failed',
};

const statusColors = {
  pending: 'badge-brass',
  sending: 'badge-brass',
  sent: 'badge-forest',
  failed: 'badge-brick',
};

export default function AdminEmails() {
  useDocumentTitle('Email Queue');
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'emails', page],
    queryFn: async () => {
      const response = await api.get(`/admin/failed-emails?page=${page}&limit=20`);
      return response.data;
    },
  });

  const retryEmailMutation = useMutation({
    mutationFn: (id) => api.post(`/admin/failed-emails/${id}/retry`),
    onSuccess: () => {
      toast.success('Email queued for retry');
      queryClient.invalidateQueries({ queryKey: ['admin', 'emails'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to retry email');
    },
  });

  const handleRetry = (emailId) => {
    retryEmailMutation.mutate(emailId);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="card p-6">
            <div className="h-4 bg-taupe/40 rounded-xl w-1/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">Email Queue</h1>
        <p className="text-sm text-charcoal/60 mt-1">View and retry failed or pending emails</p>
      </div>

      {data?.data && data.data.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-taupe">
          <span className="text-5xl mb-4 block">📧</span>
          <p className="text-charcoal font-semibold text-base">No failed or pending emails</p>
          <p className="text-charcoal/60 text-xs mt-1">All emails are being processed successfully</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-taupe-50 font-semibold text-charcoal/70 border-b border-taupe">
                    <th className="p-4 sm:p-5">To</th>
                    <th className="p-4 sm:p-5 max-w-xs">Subject</th>
                    <th className="p-4 sm:p-5">Status</th>
                    <th className="p-4 sm:p-5">Attempts</th>
                    <th className="p-4 sm:p-5 hidden lg:table-cell">Last Error</th>
                    <th className="p-4 sm:p-5 hidden lg:table-cell">Next Retry</th>
                    <th className="p-4 sm:p-5">Created</th>
                    <th className="p-4 sm:p-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-taupe">
                  {data?.data?.map((email) => (
                    <tr key={email.id} className="hover:bg-taupe-50/70 transition-colors">
                      <td className="p-4 sm:p-5 font-medium text-charcoal">{email.to}</td>
                      <td className="p-4 sm:p-5 max-w-xs truncate text-charcoal/80">{email.subject}</td>
                      <td className="p-4 sm:p-5">
                        <span className={`${statusColors[email.status]} px-2.5 py-1 text-xs font-semibold uppercase`}>
                          {statusLabels[email.status]}
                        </span>
                      </td>
                      <td className="p-4 sm:p-5 text-charcoal/70 font-mono text-xs">{email.attempts}/{email.maxAttempts}</td>
                      <td className="p-4 sm:p-5 hidden lg:table-cell text-xs text-charcoal/60 max-w-md truncate" title={email.lastError}>
                        {email.lastError || '-'}
                      </td>
                      <td className="p-4 sm:p-5 hidden lg:table-cell text-xs text-charcoal/60">
                        {email.nextRetryAt ? format(new Date(email.nextRetryAt), 'MMM d, HH:mm') : '-'}
                      </td>
                      <td className="p-4 sm:p-5 text-xs text-charcoal/60">{format(new Date(email.createdAt), 'MMM d, HH:mm')}</td>
                      <td className="p-4 sm:p-5 text-right whitespace-nowrap">
                        {(email.status === 'failed' || email.status === 'pending') && (
                          <button
                            onClick={() => handleRetry(email.id)}
                            disabled={retryEmailMutation.isPending}
                            className="btn-outline text-xs px-2.5 py-1.5 min-h-[36px]"
                          >
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {data?.meta && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4 border-t border-taupe">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-xs px-3 py-1.5 min-h-[36px] disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-4 text-xs font-medium text-charcoal/60">Page {page} of {data.meta.totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                disabled={page === data.meta.totalPages}
                className="btn-secondary text-xs px-3 py-1.5 min-h-[36px] disabled:opacity-40"
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
