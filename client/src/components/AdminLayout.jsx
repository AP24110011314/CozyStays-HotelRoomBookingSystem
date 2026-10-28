import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  BedDouble,
  CalendarDays,
  Mail,
  BarChart3,
  ArrowLeft,
  LogOut,
  Menu,
  X,
  CreditCard,
} from 'lucide-react';
import { HOTEL_CONFIG } from '../config/hotel';

export default function AdminLayout() {
  const { logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/rooms', label: 'Rooms', icon: BedDouble },
    { path: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
    { path: '/admin/payments', label: 'Payments', icon: CreditCard },
    { path: '/admin/occupancy', label: 'Occupancy', icon: BarChart3 },
    { path: '/admin/emails', label: 'Email Queue', icon: Mail },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-ivory/40 text-charcoal">
      {/* Top Navbar: Forest Green with Ivory Text and macOS frosted glass translucency */}
      <header className="bg-forest/90 backdrop-blur-xl saturate-180 text-ivory shadow-[0_4px_24px_rgba(0,0,0,0.12),inset_0_-1px_0_rgba(255,255,255,0.08)] border-b border-forest-600/80 sticky top-0 z-40 transition-all">
        <div className="container-main">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link
                to="/admin"
                className="text-xl sm:text-2xl font-bold text-ivory flex items-center gap-2.5 min-h-[44px]"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-forest-800 text-brass border border-forest-600 flex items-center justify-center shadow-xs">
                  <LayoutDashboard className="w-5 h-5 text-brass" />
                </div>
                <div className="flex flex-col">
                  <span className="leading-tight font-bold tracking-tight text-ivory">Admin Portal</span>
                  <span className="text-[10px] text-brass font-bold uppercase tracking-wider">
                    {HOTEL_CONFIG.name} Management
                  </span>
                </div>
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden lg:flex items-center gap-1.5">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${
                        isActive
                          ? 'bg-forest-700 text-brass font-bold shadow-2xs'
                          : 'text-ivory/80 hover:text-ivory hover:bg-forest-600'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-brass" />
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
                className="inline-flex items-center justify-center px-3 py-2 min-h-[36px] rounded-xl text-xs font-semibold bg-forest-700 hover:bg-forest-600 text-ivory border border-forest-500 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5 text-brass" />
                Guest View
              </Link>
              <button
                onClick={() => logout()}
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
                className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-ivory hover:bg-forest-600 focus:outline-none focus:ring-2 focus:ring-brass"
                aria-label="Toggle Admin Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-forest-600 bg-forest text-ivory px-4 pt-3 pb-6 space-y-3 shadow-xl">
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
                        ? 'bg-forest-700 text-brass font-bold'
                        : 'text-ivory/80 hover:bg-forest-600'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-brass" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-forest-600 flex flex-col gap-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center w-full py-2.5 text-sm min-h-[44px] rounded-xl font-semibold border border-ivory/40 text-ivory hover:bg-forest-600"
              >
                <ArrowLeft className="w-4 h-4 mr-2 text-brass" />
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
      <footer className="bg-forest text-ivory border-t border-forest-600 mt-auto py-6">
        <div className="container-main flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-ivory/80 text-center sm:text-left">
          <p>{HOTEL_CONFIG.name} — Administrator Panel</p>
          <p className="flex items-center gap-2 justify-center text-ivory/90">
            <span className="w-2 h-2 rounded-full bg-brass"></span>
            Admin API Authenticated
          </p>
        </div>
      </footer>
    </div>
  );
}
