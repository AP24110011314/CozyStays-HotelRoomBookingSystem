import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../api/client';
import toast from 'react-hot-toast';

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
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Email Queue</h1>

      {data?.data && data.data.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No failed or pending emails</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-600 border-b border-gray-200">
                  <th className="pb-3 font-medium">To</th>
                  <th className="pb-3 font-medium">Subject</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Attempts</th>
                  <th className="pb-3 font-medium">Last Error</th>
                  <th className="pb-3 font-medium">Next Retry</th>
                  <th className="pb-3 font-medium">Created</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.data?.map((email) => (
                  <tr key={email.id} className="hover:bg-gray-50">
                    <td className="py-4">{email.to}</td>
                    <td className="py-4 max-w-xs truncate">{email.subject}</td>
                    <td className="py-4">
                      <span className={`${statusColors[email.status]}`}>
                        {statusLabels[email.status]}
                      </span>
                    </td>
                    <td className="py-4">{email.attempts}/{email.maxAttempts}</td>
                    <td className="py-4 text-sm text-gray-600 max-w-md truncate" title={email.lastError}>
                      {email.lastError || '-'}
                    </td>
                    <td className="py-4 text-sm">
                      {email.nextRetryAt ? format(new Date(email.nextRetryAt), 'MMM d, HH:mm') : '-'}
                    </td>
                    <td className="py-4 text-sm">{format(new Date(email.createdAt), 'MMM d, HH:mm')}</td>
                    <td className="py-4">
                      {(email.status === 'failed' || email.status === 'pending') && (
                        <button
                          onClick={() => handleRetry(email.id)}
                          disabled={retryEmailMutation.isPending}
                          className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
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

          {data?.meta && data.meta.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary"
              >
                Previous
              </button>
              <span className="text-gray-600">Page {page} of {data.meta.totalPages}</span>
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