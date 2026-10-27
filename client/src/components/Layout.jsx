import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Hotel, Calendar, ShieldCheck, Menu, X, LogOut, User } from 'lucide-react';

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { path: '/', label: 'Rooms', icon: Hotel },
    { path: '/bookings', label: 'My Bookings', icon: Calendar },
  ];

  if (isAdmin) {
    navigation.push({ path: '/admin', label: 'Admin Dashboard', icon: ShieldCheck });
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200/80 sticky top-0 z-40">
        <div className="container-main">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link
                to="/"
                className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5 min-h-[44px]"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <Hotel className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="tracking-tight">Hotel Booking</span>
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${
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

            {/* Desktop User actions */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>{user.name}</span>
                    <span className="text-slate-400">|</span>
                    <span className="capitalize font-semibold text-indigo-600">{user.role}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="btn-secondary text-xs px-3 py-2 min-h-[36px]"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4 mr-1.5" />
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login" className="btn-secondary text-xs px-3.5 py-2 min-h-[36px]">
                    Sign In
                  </Link>
                  <Link to="/register" className="btn-primary text-xs px-3.5 py-2 min-h-[36px]">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button (min 44px tap target) */}
            <div className="flex md:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg animate-fadeIn">
            <nav className="flex flex-col gap-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
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

            {user ? (
              <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 text-slate-700 text-sm">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{user.name}</span>
                  <span className="text-xs text-indigo-600 font-semibold ml-auto capitalize bg-indigo-50 px-2 py-0.5 rounded-full">
                    {user.role}
                  </span>
                </div>
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
            ) : (
              <div className="pt-4 border-t border-slate-100 flex gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-secondary flex-1 justify-center py-2.5 text-sm min-h-[44px]"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-primary flex-1 justify-center py-2.5 text-sm min-h-[44px]"
                >
                  Sign Up
                </Link>
              </div>
            )}
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
          <p>Hotel Booking System &copy; 2026. All rights reserved.</p>
          <p className="flex items-center gap-2 justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Cloud Database Connected
          </p>
        </div>
      </footer>
    </div>
  );
}