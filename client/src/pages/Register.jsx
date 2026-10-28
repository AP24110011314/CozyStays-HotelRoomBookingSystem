import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Hotel, User, Mail, Lock, UserPlus, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { HOTEL_CONFIG } from '../config/hotel';
import HotelSpecs from '../components/HotelSpecs';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function Register() {
  useDocumentTitle(`Register | ${HOTEL_CONFIG.name}`);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextUrl = searchParams.get('next') || '/';

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      await registerUser(data.name, data.email, data.password);
      toast.success('Account created successfully!');
      navigate(nextUrl);
    } catch (error) {
      const message =
        error.response?.data?.error?.message || 'Registration failed. Please check your details.';
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
                className="text-[10px] font-semibold bg-white/20 backdrop-blur-md text-ivory px-2 py-0.5 rounded-md"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* DESKTOP LEFT COLUMN: Photo, Specs & Branding (1024px and up) */}
      <div className="hidden lg:flex lg:col-span-7 relative flex-col justify-between p-10 xl:p-14 text-ivory overflow-hidden min-h-screen bg-forest-950">
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

        {/* Overlays */}
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
            <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-ivory">
              {HOTEL_CONFIG.tagline}
            </h2>
            <p className="text-sm text-taupe-100 leading-relaxed">
              Create your account to unlock instant bookings, easy cancellations, and transparent payment options.
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

      {/* RIGHT COLUMN: Register Form (Both Mobile and Desktop) */}
      <div className="flex-1 lg:col-span-5 flex flex-col justify-center px-4 sm:px-8 lg:px-10 xl:px-14 py-8 lg:py-12 bg-white">
        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-1.5">
            <div className="hidden lg:flex items-center gap-2 text-forest font-semibold text-xs tracking-wider uppercase mb-1">
              <span>New Guest Registration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal tracking-tight">
              Create Account
            </h1>
            <p className="text-xs sm:text-sm text-charcoal/60">
              Join to reserve rooms and manage reservations effortlessly
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

          {/* Registration Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            <div className="space-y-1.5">
              <label
                htmlFor="name"
                className="text-xs font-bold uppercase tracking-wider text-charcoal/80"
              >
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-charcoal/40 absolute left-3.5 top-3.5" />
                <input
                  id="name"
                  type="text"
                  {...register('name')}
                  placeholder="Jane Doe"
                  autoComplete="name"
                  className="input pl-10 pr-3"
                />
              </div>
              {errors.name && (
                <p className="text-xs text-brick font-medium">{errors.name.message}</p>
              )}
            </div>

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
                  placeholder="jane@example.com"
                  autoComplete="email"
                  className="input pl-10 pr-3"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-brick font-medium">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-bold uppercase tracking-wider text-charcoal/80"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-charcoal/40 absolute left-3.5 top-3.5" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
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

            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="text-xs font-bold uppercase tracking-wider text-charcoal/80"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-charcoal/40 absolute left-3.5 top-3.5" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  className="input pl-10 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-2.5 p-1 text-charcoal/40 hover:text-charcoal rounded-lg min-w-[32px] min-h-[32px] flex items-center justify-center transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-brick font-medium">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full justify-center py-3 text-sm font-bold min-h-[48px] shadow-xs hover:shadow-sm transition-all active:scale-[0.99] mt-3"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-charcoal/30 border-t-charcoal rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </span>
              )}
            </button>
          </form>

          {/* Switch to Login */}
          <div className="pt-4 border-t border-taupe text-center text-xs text-charcoal/60">
            Already have an account?{' '}
            <Link
              to={nextUrl !== '/' ? `/login?next=${encodeURIComponent(nextUrl)}` : '/login'}
              className="font-bold text-forest hover:text-forest-600 inline-flex items-center gap-1 ml-1"
            >
              Sign in
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
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
