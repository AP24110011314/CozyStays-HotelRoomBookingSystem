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
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/70 to-transparent flex flex-col justify-end p-5">
          <Link to="/" className="inline-flex items-center gap-2 text-ivory mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-brass text-charcoal flex items-center justify-center shadow-xs">
              <Hotel className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-ivory">{HOTEL_CONFIG.name}</span>
          </Link>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {HOTEL_CONFIG.mobileChips.map((chip) => (
              <span
                key={chip}
                className="text-[11px] font-bold bg-[#0c1f19]/90 border border-brass/50 text-white px-2.5 py-1 rounded-md shadow-xs"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* DESKTOP LEFT COLUMN: Photo, Specs & Branding (1024px and up) */}
      <div className="hidden lg:flex lg:col-span-7 relative flex-col justify-between p-10 xl:p-14 text-ivory overflow-hidden min-h-screen bg-forest-950">
        {/* Background Image with optimized <picture> */}
        <picture className="absolute inset-0 z-0">
          <source srcSet="/images/hotel-login.webp" type="image/webp" />
          <img
            src="/images/hotel-login.jpg"
            alt={`Exterior and amenities of ${HOTEL_CONFIG.name}`}
            width="1600"
            height="1067"
            loading="eager"
            className="w-full h-full object-cover scale-105"
          />
        </picture>

        {/* Soft dark gradient overlays */}
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-forest-950 via-forest-950/80 to-forest-950/40" />
        <div className="absolute inset-0 z-0 bg-forest-950/30 mix-blend-multiply" />

        {/* Top Branding */}
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-brass text-charcoal flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Hotel className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-ivory block">
                {HOTEL_CONFIG.name}
              </span>
              <span className="text-xs text-brass tracking-wider uppercase font-semibold">
                Luxury Stays & Suites
              </span>
            </div>
          </Link>
        </div>

        {/* Bottom Content: Tagline + Specifications Grid */}
        <div className="relative z-10 space-y-6 pt-12">
          <div className="space-y-2 max-w-xl">
            <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
              {HOTEL_CONFIG.tagline}
            </h2>
            <p className="text-sm text-taupe-100 font-medium leading-relaxed drop-shadow-sm">
              Sign in to manage your bookings, make quick modifications, and access exclusive guest rates.
            </p>
          </div>

          {/* Specifications */}
          <div className="pt-2">
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
