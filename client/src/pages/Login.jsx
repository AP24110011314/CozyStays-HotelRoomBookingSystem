import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Hotel, Mail, Lock, LogIn, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  useDocumentTitle('Sign In');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Hotel className="w-6 h-6" />
            </div>
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">Hotel Booking</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Welcome Back</h1>
          <p className="text-xs sm:text-sm text-slate-500">Sign in to manage your reservations and account</p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="name@example.com"
                  className="w-full pl-10 text-base rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 py-2.5"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-rose-600 font-medium">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  id="password"
                  type="password"
                  {...register('password')}
                  placeholder="••••••••"
                  className="w-full pl-10 text-base rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 py-2.5"
                />
              </div>
              {errors.password && (
                <p className="text-xs text-rose-600 font-medium">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full justify-center py-3 text-sm font-bold min-h-[48px] shadow-sm mt-2"
            >
              {isLoading ? (
                'Signing in...'
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-0.5">
              Sign up
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Demo credentials hint */}
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-900 space-y-1 text-center">
          <p className="font-semibold">Demo Admin Credentials:</p>
          <p className="font-mono text-[11px] text-slate-600">admin@hotel.test / Admin@12345</p>
        </div>
      </div>
    </div>
  );
}