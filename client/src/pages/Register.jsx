import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Hotel, User, Mail, Lock, UserPlus, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export default function Register() {
  useDocumentTitle('Register');
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await registerUser(data.name, data.email, data.password);
      toast.success('Account created successfully!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Registration failed');
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Create Account</h1>
          <p className="text-xs sm:text-sm text-slate-500">Join now to book rooms and track your reservations</p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  id="name"
                  type="text"
                  {...register('name')}
                  placeholder="Jane Doe"
                  className="w-full pl-10 text-base rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 py-2.5"
                />
              </div>
              {errors.name && (
                <p className="text-xs text-rose-600 font-medium">{errors.name.message}</p>
              )}
            </div>

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
                  placeholder="jane@example.com"
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

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword')}
                  placeholder="••••••••"
                  className="w-full pl-10 text-base rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 py-2.5"
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-rose-600 font-medium">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full justify-center py-3 text-sm font-bold min-h-[48px] shadow-sm mt-2"
            >
              {isLoading ? (
                'Creating account...'
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-0.5">
              Sign in
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}