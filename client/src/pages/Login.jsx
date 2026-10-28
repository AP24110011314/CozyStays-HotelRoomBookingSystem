import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Hotel, Mail, Lock, LogIn, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { HOTEL_CONFIG } from '../config/hotel';
import HotelSpecs from '../components/HotelSpecs';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  useDocumentTitle(`Sign in | ${HOTEL_CONFIG.name}`);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextUrl = searchParams.get('next') || '/';

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch dynamic public config for cancellation rule & currency
  const { data: config } = useQuery({
    queryKey: ['publicConfig'],
    queryFn: async () => {
      const res = await api.get('/config/public');
      return res.data?.data;
    },
    staleTime: 1000 * 60 * 10,
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      navigate(nextUrl);
    } catch (error) {
      const message =
        error.response?.data?.error?.message || 'Invalid email or password. Please try again.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory flex flex-col lg:grid lg:grid-cols-12 overflow-x-hidden">
      {/* MOBILE HEADER BANNER (Visible below 1024px) */}
      <div className="lg:hidden relative w-full h-52 sm:h-56 bg-forest-900 overflow-hidden shrink-0">
        <picture>
          <source srcSet="/images/hotel-login.webp" type="image/webp" />
          <img
            src="/images/hotel-login.jpg"
            alt={`Exterior view of ${HOTEL_CONFIG.name}`}
            width="1600"
            height="1067"
            loading="eager"
            className="w-full h-full object-cover opacity-60"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 via-charcoal-900/40 to-transparent flex flex-col justify-end p-5">
          <Link
            to="/"
            className="inline-flex items-center gap-2 mac-glass-badge px-3 py-1.5 rounded-xl w-fit mb-2"
          >
            <div className="w-7 h-7 rounded-lg bg-brass text-charcoal flex items-center justify-center shadow-xs">
              <Hotel className="w-4 h-4 text-charcoal stroke-[2.2]" />
            </div>
            <span className="text-base font-black tracking-tight text-white drop-shadow-sm">{HOTEL_CONFIG.name}</span>
          </Link>
          <div className="flex flex-wrap gap-1.5">
            {HOTEL_CONFIG.mobileChips.map((chip) => (
              <span
                key={chip}
                className="text-[11px] font-bold mac-glass-badge text-white px-2.5 py-1 rounded-lg drop-shadow-sm"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* DESKTOP LEFT COLUMN: Photo, Specs & Branding (1024px and up) */}
      <div className="hidden lg:flex lg:col-span-7 relative flex-col justify-between p-6 lg:p-8 xl:p-10 text-ivory min-h-screen bg-charcoal-900 overflow-y-auto">
        {/* Background Image with optimized <picture> */}
        <picture className="absolute inset-0 z-0">
          <source srcSet="/images/hotel-login.webp" type="image/webp" />
          <img
            src="/images/hotel-login.jpg"
            alt={`Exterior and amenities of ${HOTEL_CONFIG.name}`}
            width="1600"
            height="900"
            loading="eager"
            className="w-full h-full object-cover"
          />
        </picture>

        {/* Subtle dark gradient overlay so the wide view hotel photo is beautifully visible */}
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-charcoal-900/65 via-charcoal-900/40 to-charcoal-900/25" />

        {/* Top Branding */}
        <div className="relative z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-3.5 mac-glass-card mac-glass-hover px-4 py-2.5 rounded-2xl group transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-brass-300 via-brass to-brass-600 text-charcoal flex items-center justify-center shadow-md shadow-brass-500/20 group-hover:scale-105 transition-transform">
              <Hotel className="w-5 h-5 text-charcoal stroke-[2.2]" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white block leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {HOTEL_CONFIG.name}
              </span>
              <span className="text-[10px] text-brass-300 tracking-wider uppercase font-extrabold block mt-0.5 drop-shadow-sm">
                Luxury Stays & Suites
              </span>
            </div>
          </Link>
        </div>

        {/* Bottom Content: Tagline + Specifications Grid */}
        <div className="relative z-10 space-y-3.5 xl:space-y-4 pt-6 xl:pt-8">
          <div className="space-y-1.5 max-w-xl mac-glass-card rounded-2xl p-4.5 xl:p-5">
            <h2 className="text-xl xl:text-2xl font-black tracking-tight text-white leading-snug drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
              {HOTEL_CONFIG.tagline}
            </h2>
            <p className="text-xs text-white/95 font-medium leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
              Sign in to manage your bookings, make quick modifications, and access exclusive guest rates.
            </p>
          </div>

          {/* Specifications */}
          <div className="pt-0.5">
            <HotelSpecs
              variant="overlay"
              cancellationHours={config?.cancellationWindowHours}
            />
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Sign In Form (Both Mobile and Desktop) */}
      <div className="flex-1 lg:col-span-5 flex flex-col justify-center px-4 sm:px-8 lg:px-10 xl:px-14 py-8 lg:py-12 bg-white">
        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-1.5">
            <div className="hidden lg:flex items-center gap-2 text-forest font-semibold text-xs tracking-wider uppercase mb-1">
              <span>Guest Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal tracking-tight">
              Welcome Back
            </h1>
            <p className="text-xs sm:text-sm text-charcoal/60">
              Sign in to continue to your reservations and account
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-brick-50 border border-brick-200 text-brick-700 text-sm flex items-start gap-2.5 animate-fadeIn"
            >
              <AlertCircle className="w-5 h-5 shrink-0 text-brick mt-0.5" />
              <div className="flex-1 text-xs sm:text-sm font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-bold uppercase tracking-wider text-charcoal/80"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-charcoal/40 absolute left-3.5 top-3.5" />
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="input pl-10 pr-3"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-brick font-medium">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-bold uppercase tracking-wider text-charcoal/80"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-charcoal/40 absolute left-3.5 top-3.5" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="input pl-10 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-2.5 p-1 text-charcoal/40 hover:text-charcoal rounded-lg min-w-[32px] min-h-[32px] flex items-center justify-center transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-brick font-medium">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full justify-center py-3 text-sm font-bold min-h-[48px] shadow-xs hover:shadow-sm transition-all active:scale-[0.99] mt-2"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-charcoal/30 border-t-charcoal rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </span>
              )}
            </button>
          </form>

          {/* Switch to Register */}
          <div className="pt-4 border-t border-taupe text-center text-xs text-charcoal/60">
            Don&apos;t have an account?{' '}
            <Link
              to={nextUrl !== '/' ? `/register?next=${encodeURIComponent(nextUrl)}` : '/register'}
              className="font-bold text-forest hover:text-forest-600 inline-flex items-center gap-1 ml-1"
            >
              Sign up
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Demo Credentials Box */}
          <div className="bg-forest-50 border border-forest-200 rounded-2xl p-3.5 text-xs space-y-2 text-center">
            <div className="flex items-center justify-between text-charcoal font-bold px-1">
              <span className="text-xs font-bold text-forest">Demo Guest Credentials:</span>
              <button
                type="button"
                onClick={() => {
                  setValue('email', 'guest1@test.com', { shouldValidate: true });
                  setValue('password', 'Guest@12345', { shouldValidate: true });
                }}
                className="text-[11px] bg-forest text-ivory px-2.5 py-1 rounded-lg font-semibold hover:bg-forest-600 transition-colors cursor-pointer shadow-xs"
              >
                Auto-fill
              </button>
            </div>
            <p className="font-mono text-xs font-semibold text-charcoal bg-white py-2 px-3 rounded-xl border border-taupe block select-all">
              guest1@test.com / Guest@12345
            </p>
          </div>

          {/* Specifications block below form on Mobile */}
          <div className="lg:hidden pt-6 border-t border-taupe">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal/60 mb-3">
              Hotel Amenities & Specifications
            </h3>
            <HotelSpecs
              variant="card"
              cancellationHours={config?.cancellationWindowHours}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
