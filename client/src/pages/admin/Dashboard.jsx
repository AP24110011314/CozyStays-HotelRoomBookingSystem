import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api/client';

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const response = await api.get('/admin/stats');
      return response.data.data;
    },
  });

  const statCards = [
    { label: 'Total Rooms', value: stats?.totalRooms ?? 0, icon: '🏨', color: 'text-indigo-600' },
    { label: 'Active Bookings', value: stats?.activeBookings ?? 0, icon: '📋', color: 'text-green-600' },
    { label: 'Occupancy (30 days)', value: `${stats?.occupancyPct ?? 0}%`, icon: '📊', color: 'text-blue-600' },
    { label: 'Revenue (30 days)', value: `$${((stats?.revenue30d ?? 0) / 100).toLocaleString()}`, icon: '💰', color: 'text-yellow-600' },
  ];

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-6">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="mt-4 h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((stat) => (
          <Link key={stat.label} to={`/admin/${stat.label.toLowerCase().replace(/\s+/g, '')}`} className="card p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <span className={`text-4xl ${stat.color}`}>{stat.icon}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link to="/admin/rooms" className="card p-6 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Rooms</h3>
          <p className="text-gray-600">Create, edit, and toggle room availability</p>
        </Link>
        <Link to="/admin/bookings" className="card p-6 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Bookings</h3>
          <p className="text-gray-600">View and cancel all bookings</p>
        </Link>
        <Link to="/admin/emails" className="card p-6 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Queue</h3>
          <p className="text-gray-600">View failed emails and retry sending</p>
        </Link>
        <Link to="/admin/occupancy" className="card p-6 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Occupancy Report</h3>
          <p className="text-gray-600">View room occupancy by month</p>
        </Link>
      </div>
    </div>
  );
}