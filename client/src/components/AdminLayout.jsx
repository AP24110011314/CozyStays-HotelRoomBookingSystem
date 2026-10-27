import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, BedDouble, CalendarDays, Mail, BarChart3, ArrowLeft, LogOut, Menu, X } from 'lucide-react';

export default function AdminLayout() {
  const { logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/rooms', label: 'Rooms', icon: BedDouble },
    { path: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
    { path: '/admin/occupancy', label: 'Occupancy', icon: BarChart3 },
    { path: '/admin/emails', label: 'Email Queue', icon: Mail },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200/80 sticky top-0 z-40">
        <div className="container-main">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link
                to="/admin"
                className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5 min-h-[44px]"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="leading-tight font-bold tracking-tight">Admin Portal</span>
                  <span className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider">Hotel Management</span>
                </div>
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden lg:flex items-center gap-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                to="/"
                className="btn-secondary text-xs px-3 py-2 min-h-[36px]"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Guest View
              </Link>
              <button
                onClick={logout}
                className="btn-danger text-xs px-3 py-2 min-h-[36px]"
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                Logout
              </button>
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Toggle Admin Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
            <nav className="flex flex-col gap-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold min-h-[48px] ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-indigo-600" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-secondary w-full justify-center min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Switch to Guest View
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="btn-danger w-full justify-center min-h-[44px]"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="container-main flex-1 py-6 sm:py-10">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6">
        <div className="container-main flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-slate-500 text-center sm:text-left">
          <p>Hotel Booking System — Administrator Panel</p>
          <p className="flex items-center gap-2 justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Admin API Authenticated
          </p>
        </div>
      </footer>
    </div>
  );
}