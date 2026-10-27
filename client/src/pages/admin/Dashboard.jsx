import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { formatINRCompact } from '../../utils/currency';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import {
  CalendarCheck,
  LogIn,
  Percent,
  Coins,
  BedDouble,
  ClipboardList,
  Mail,
  BarChart3,
  ArrowRight,
} from 'lucide-react';

export default function AdminDashboard() {
  useDocumentTitle('Admin Dashboard');

  const { data: stats, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const response = await api.get('/admin/stats');
      return response.data.data;
    },
  });

  const statCards = [
    {
      label: 'Bookings Today',
      value: stats?.bookingsToday ?? 0,
      icon: CalendarCheck,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      description: 'Reservations created today',
    },
    {
      label: 'Check-ins Today',
      value: stats?.checkInsToday ?? 0,
      icon: LogIn,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Guests arriving today',
    },
    {
      label: 'Occupancy (Next 30 Days)',
      value: `${stats?.occupancyPct ?? 0}%`,
      icon: Percent,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      description: 'Booked room nights / capacity',
    },
    {
      label: 'Revenue (This Month)',
      value: formatINRCompact(stats?.revenue30d ?? 0),
      icon: Coins,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      description: 'Confirmed booking revenue (30d)',
    },
    {
      label: 'Total Rooms',
      value: stats?.totalRooms ?? 0,
      icon: BedDouble,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      description: 'Active and inactive rooms',
    },
    {
      label: 'Active Stays',
      value: stats?.activeBookings ?? 0,
      icon: ClipboardList,
      color: 'bg-slate-100 text-slate-800 border-slate-200',
      description: 'Currently in-house guests',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-xl w-1/4"></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-6 h-32">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-4"></div>
              <div className="h-8 bg-slate-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card p-8 text-center bg-rose-50 border-rose-200">
        <p className="text-rose-700 font-semibold">Failed to load admin statistics</p>
        <p className="text-xs text-rose-500 mt-1">{error?.message || 'Server connection error'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">System Overview</h1>
        <p className="text-sm text-slate-500 mt-1">Live operational metrics and management shortcuts</p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card p-5 sm:p-6 transition-all hover:shadow-md">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1.5">{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{stat.description}</p>
                </div>
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center flex-shrink-0 ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Navigation Cards */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4 tracking-tight">Management Areas</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/admin/rooms"
            className="card p-5 sm:p-6 transition-all hover:shadow-md hover:border-indigo-300 group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 border border-indigo-100">
                <BedDouble className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Manage Rooms</h3>
              <p className="text-xs text-slate-500 mt-1">Catalog, create new rooms, toggle availability, edit prices</p>
            </div>
            <div className="flex items-center text-xs font-semibold text-indigo-600 mt-4 group-hover:translate-x-1 transition-transform">
              Open Catalog <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          <Link
            to="/admin/bookings"
            className="card p-5 sm:p-6 transition-all hover:shadow-md hover:border-emerald-300 group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-100">
                <ClipboardList className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">Manage Bookings</h3>
              <p className="text-xs text-slate-500 mt-1">Search by reference or guest, inspect reservation details, modify dates</p>
            </div>
            <div className="flex items-center text-xs font-semibold text-emerald-600 mt-4 group-hover:translate-x-1 transition-transform">
              View Bookings <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          <Link
            to="/admin/occupancy"
            className="card p-5 sm:p-6 transition-all hover:shadow-md hover:border-blue-300 group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 border border-blue-100">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Occupancy Calendar</h3>
              <p className="text-xs text-slate-500 mt-1">Visual grid of room nights, monthly calendar, and occupancy rates</p>
            </div>
            <div className="flex items-center text-xs font-semibold text-blue-600 mt-4 group-hover:translate-x-1 transition-transform">
              Inspect Grid <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          <Link
            to="/admin/emails"
            className="card p-5 sm:p-6 transition-all hover:shadow-md hover:border-amber-300 group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-100">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">Email Outbox</h3>
              <p className="text-xs text-slate-500 mt-1">Monitor email status, check delivery attempts, retry stuck or failed emails</p>
            </div>
            <div className="flex items-center text-xs font-semibold text-amber-600 mt-4 group-hover:translate-x-1 transition-transform">
              Open Outbox <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}