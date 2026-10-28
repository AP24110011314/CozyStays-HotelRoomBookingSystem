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
    <div className="min-h-screen bg-slate-50 flex flex-col lg:grid lg:grid-cols-12 overflow-x-hidden">
      {/* MOBILE HEADER BANNER (Visible below 1024px) */}
      <div className="lg:hidden relative w-full h-52 sm:h-56 bg-slate-900 overflow-hidden shrink-0">
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
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent flex flex-col justify-end p-5">
          <Link to="/" className="inline-flex items-center gap-2 text-white mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Hotel className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold tracking-tight">{HOTEL_CONFIG.name}</span>
          </Link>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {HOTEL_CONFIG.mobileChips.map((chip) => (
              <span
                key={chip}
                className="text-[10px] font-semibold bg-white/20 backdrop-blur-md text-white px-2 py-0.5 rounded-md"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* DESKTOP LEFT COLUMN: Photo, Specs & Branding (1024px and up) */}
      <div className="hidden lg:flex lg:col-span-7 relative flex-col justify-between p-10 xl:p-14 text-white overflow-hidden min-h-screen bg-slate-950">
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
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/30" />
        <div className="absolute inset-0 z-0 bg-indigo-950/20 mix-blend-multiply" />

        {/* Top Branding */}
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/90 backdrop-blur-md text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 group-hover:scale-105 transition-transform">
              <Hotel className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white block">
                {HOTEL_CONFIG.name}
              </span>
              <span className="text-xs text-indigo-200 tracking-wider uppercase font-semibold">
                Luxury Stays & Suites
              </span>
            </div>
          </Link>
        </div>

        {/* Bottom Content: Tagline + Specifications Grid */}
        <div className="relative z-10 space-y-6 pt-12">
          <div className="space-y-2 max-w-xl">
            <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-white">
              {HOTEL_CONFIG.tagline}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
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
            <div className="hidden lg:flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase mb-1">
              <span>Guest Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Sign in to continue to your reservations and account
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5 animate-fadeIn"
            >
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1 text-xs sm:text-sm font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-3 text-base rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 py-2.5 min-h-[44px]"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-rose-600 font-medium">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 text-base rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 py-2.5 min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-lg min-w-[32px] min-h-[32px] flex items-center justify-center transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-rose-600 font-medium">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full justify-center py-3 text-sm font-bold min-h-[48px] shadow-sm hover:shadow-md transition-all active:scale-[0.99] mt-2"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            Don&apos;t have an account?{' '}
            <Link
              to={nextUrl !== '/' ? `/register?next=${encodeURIComponent(nextUrl)}` : '/register'}
              className="font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 ml-1"
            >
              Sign up
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Demo Credentials Box */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3.5 text-xs text-indigo-900 space-y-1.5 text-center">
            <div className="flex items-center justify-between text-slate-800 font-semibold px-1">
              <span>Demo Guest Credentials:</span>
              <button
                type="button"
                onClick={() => {
                  setValue('email', 'guest1@test.com', { shouldValidate: true });
                  setValue('password', 'Guest@12345', { shouldValidate: true });
                }}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
              >
                Auto-fill
              </button>
            </div>
            <p className="font-mono text-[11px] text-indigo-700 bg-white/80 py-1.5 px-3 rounded-xl border border-indigo-100/70 block select-all">
              guest1@test.com / Guest@12345
            </p>
          </div>

          {/* Specifications block below form on Mobile */}
          <div className="lg:hidden pt-6 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
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
