import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Hotel, Calendar, ShieldCheck, Menu, X, LogOut, User } from 'lucide-react';
import logoSvg from '../assets/logo.svg';
import { HOTEL_CONFIG } from '../config/hotel';

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
    <div className="min-h-screen flex flex-col bg-ivory text-charcoal">
      {/* Top Navbar: Forest Green with Ivory Text */}
      <header className="bg-forest text-ivory shadow-sm border-b border-forest-600 sticky top-0 z-40">
        <div className="container-main">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link
                to="/"
                className="flex items-center gap-2.5 min-h-[44px]"
                onClick={() => setMobileMenuOpen(false)}
                title={HOTEL_CONFIG.name}
              >
                <img src={logoSvg} alt={HOTEL_CONFIG.name} className="h-9 sm:h-10 w-auto" />
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-1.5">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    location.pathname === item.path ||
                    (item.path !== '/' && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${
                        isActive
                          ? 'bg-forest-700 text-brass shadow-2xs font-bold'
                          : 'text-ivory/85 hover:text-ivory hover:bg-forest-600'
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
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-forest-700/80 border border-forest-600 text-ivory text-xs font-medium">
                    <User className="w-3.5 h-3.5 text-brass" />
                    <span>{user.name}</span>
                    <span className="text-forest-400">|</span>
                    <span className="capitalize font-bold text-brass">{user.role}</span>
                  </div>
                  <button
                    onClick={() => logout()}
                    className="inline-flex items-center justify-center px-3 py-2 min-h-[36px] rounded-xl text-xs font-semibold bg-forest-700 hover:bg-forest-600 text-ivory border border-forest-500 transition-colors cursor-pointer"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4 mr-1.5" />
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center px-3.5 py-2 min-h-[36px] rounded-xl text-xs font-semibold border border-ivory/40 text-ivory hover:bg-forest-600 hover:text-ivory transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center px-3.5 py-2 min-h-[36px] rounded-xl text-xs font-bold bg-brass text-charcoal hover:bg-brass-500 transition-colors shadow-xs"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex md:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-ivory hover:bg-forest-600 focus:outline-none focus:ring-2 focus:ring-brass"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-forest-600 bg-forest text-ivory px-4 pt-3 pb-6 space-y-3 shadow-xl animate-fadeIn">
            <nav className="flex flex-col gap-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold min-h-[48px] ${
                      isActive
                        ? 'bg-forest-700 text-brass font-bold'
                        : 'text-ivory/85 hover:bg-forest-600'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-brass" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {user ? (
              <div className="pt-4 border-t border-forest-600 flex flex-col gap-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-forest-700 border border-forest-600 text-ivory text-sm">
                  <User className="w-4 h-4 text-brass" />
                  <span className="font-medium">{user.name}</span>
                  <span className="text-xs text-brass font-bold ml-auto capitalize bg-forest-800 px-2 py-0.5 rounded-full">
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
              <div className="pt-4 border-t border-forest-600 flex gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center flex-1 py-2.5 text-sm min-h-[44px] rounded-xl font-semibold border border-ivory/40 text-ivory hover:bg-forest-600"
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

      {/* Footer: Forest Green with Ivory Text */}
      <footer className="bg-forest text-ivory border-t border-forest-600 mt-auto py-6">
        <div className="container-main flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-ivory/80 text-center sm:text-left">
          <p>{HOTEL_CONFIG.name} &copy; 2026. All rights reserved.</p>
          <p className="flex items-center gap-2 justify-center text-ivory/90">
            <span className="w-2 h-2 rounded-full bg-brass"></span>
            Cloud Database Connected
          </p>
        </div>
      </footer>
    </div>
  );
}
