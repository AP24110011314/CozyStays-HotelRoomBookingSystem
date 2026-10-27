import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AdminLayout() {
  const { logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/rooms', label: 'Rooms', icon: '🏨' },
    { path: '/admin/bookings', label: 'Bookings', icon: '📋' },
    { path: '/admin/emails', label: 'Emails', icon: '📧' },
    { path: '/admin/occupancy', label: 'Occupancy', icon: '📈' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="container-main">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/admin" className="text-xl font-bold text-indigo-600">Admin Panel</Link>
              <nav className="hidden md:flex items-center gap-6">
                {navigation.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`text-sm font-medium transition-colors ${
                      location.pathname === item.path
                        ? 'text-indigo-600'
                        : 'text-gray-600 hover:text-indigo-600'
                    }`}
                  >
                    {item.icon} {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={logout}
                className="btn-secondary text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="container-main py-8">
        <Outlet />
      </main>
    </div>
  );
}