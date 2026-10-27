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
  pending: 'badge-info',
  sending: 'badge-warning',
  sent: 'badge-success',
  failed: 'badge-danger',
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
          <div key={i} className="card-hover p-6">
            <div className="h-4 bg-gray-200 rounded-xl w-1/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Email Queue</h1>
        <p className="text-gray-600">View and retry failed or pending emails</p>
      </div>

      {data?.data && data.data.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <span className="text-6xl mb-4 block">📧</span>
          <p className="text-gray-600 text-lg">No failed or pending emails</p>
          <p className="text-gray-500 mt-2">All emails are being processed successfully</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left text-sm font-medium text-gray-600 border-b border-gray-100">
                    <th className="p-4 sm:p-6 font-medium">To</th>
                    <th className="p-4 sm:p-6 font-medium max-w-xs">Subject</th>
                    <th className="p-4 sm:p-6 font-medium">Status</th>
                    <th className="p-4 sm:p-6 font-medium">Attempts</th>
                    <th className="p-4 sm:p-6 font-medium hidden lg:table-cell">Last Error</th>
                    <th className="p-4 sm:p-6 font-medium hidden lg:table-cell">Next Retry</th>
                    <th className="p-4 sm:p-6 font-medium">Created</th>
                    <th className="p-4 sm:p-6 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.data?.map((email) => (
                    <tr key={email.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 sm:p-6 font-medium text-gray-900">{email.to}</td>
                      <td className="p-4 sm:p-6 max-w-xs truncate text-gray-600">{email.subject}</td>
                      <td className="p-4 sm:p-6">
                        <span className={`${statusColors[email.status]} px-3 py-1.5 text-sm`}>
                          {statusLabels[email.status]}
                        </span>
                      </td>
                      <td className="p-4 sm:p-6 text-gray-600 font-mono text-sm">{email.attempts}/{email.maxAttempts}</td>
                      <td className="p-4 sm:p-6 hidden lg:table-cell text-sm text-gray-500 max-w-md truncate" title={email.lastError}>
                        {email.lastError || '-'}
                      </td>
                      <td className="p-4 sm:p-6 hidden lg:table-cell text-sm text-gray-500">
                        {email.nextRetryAt ? format(new Date(email.nextRetryAt), 'MMM d, HH:mm') : '-'}
                      </td>
                      <td className="p-4 sm:p-6 text-sm text-gray-500">{format(new Date(email.createdAt), 'MMM d, HH:mm')}</td>
                      <td className="p-4 sm:p-6 text-right">
                        {(email.status === 'failed' || email.status === 'pending') && (
                          <button
                            onClick={() => handleRetry(email.id)}
                            disabled={retryEmailMutation.isPending}
                            className="btn-outline text-sm px-3 py-1.5"
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
            <div className="mt-8 sm:mt-12 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary"
              >
                Previous
              </button>
              <span className="px-4 text-gray-600 font-medium">Page {page} of {data.meta.totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(data.meta.totalPages, p + 1))}
                disabled={page === data.meta.totalPages}
                className="btn-secondary"
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