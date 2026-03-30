'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { UserRole } from '@/types';
import { EyeIcon, EyeSlashIcon, UserIcon, EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await signUp(email, password, name, role);
    } catch (error) {
      // Error is handled in auth context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:py-12">
      <div 
        className="absolute inset-0 -z-10"
        style={{ 
          background: 'linear-gradient(135deg, #061E29 0%, #1D546D 50%, #5F9598 100%)'
        }}
      />
      
      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-200">
          {/* Logo/Brand */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-block p-2 sm:p-3 rounded-full mb-3 sm:mb-4 bg-gray-900">
              <svg className="h-6 w-6 sm:h-8 sm:w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-1 sm:mb-2 text-gray-900">
              Create Account
            </h1>
            <p className="text-sm sm:text-base font-medium text-gray-600">
              Join our platform today
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Full Name Field */}
            <div>
              <label className="block font-semibold mb-2 text-sm sm:text-base text-gray-900">
                <span className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-teal-600" />
                  Full Name
                </span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition text-sm sm:text-base bg-gray-50 text-gray-900"
                placeholder="John Doe"
                required
              />
            </div>
            
            {/* Email Field */}
            <div>
              <label className="block font-semibold mb-2 text-sm sm:text-base text-gray-900">
                <span className="flex items-center gap-2">
                  <EnvelopeIcon className="h-4 w-4 text-teal-600" />
                  Email Address
                </span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition text-sm sm:text-base bg-gray-50 text-gray-900"
                placeholder="your@email.com"
                required
              />
            </div>
            
            {/* Password Field */}
            <div>
              <label className="block font-semibold mb-2 text-sm sm:text-base text-gray-900">
                <span className="flex items-center gap-2">
                  <LockClosedIcon className="h-4 w-4 text-teal-600" />
                  Password
                </span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition text-sm sm:text-base pr-10 sm:pr-12 bg-gray-50 text-gray-900"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 transition text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  ) : (
                    <EyeIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  )}
                </button>
              </div>
              <p className="text-xs sm:text-sm mt-1.5 font-medium text-gray-500">
                Minimum 6 characters
              </p>
            </div>
            
            {/* Role Selection */}
            <div>
              <label className="block font-semibold mb-2 text-sm sm:text-base text-gray-900">
                I am a:
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRole('customer')}
                  className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 ${
                    role === 'customer' 
                      ? 'bg-gray-900 text-white shadow-md transform scale-105' 
                      : 'bg-transparent text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  🛍️ Customer
                </button>
                <button
                  type="button"
                  onClick={() => setRole('seller')}
                  className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 ${
                    role === 'seller' 
                      ? 'bg-gray-900 text-white shadow-md transform scale-105' 
                      : 'bg-transparent text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  🏪 Seller
                </button>
              </div>
            </div>
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md mt-2 sm:mt-4"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </span>
              ) : 'Sign Up'}
            </button>
          </form>
          
          {/* Sign In Link */}
          <p className="text-center mt-6 sm:mt-8 text-sm sm:text-base font-medium text-gray-600">
            Already have an account?{' '}
            <Link 
              href="/auth/login" 
              className="font-bold hover:underline transition text-teal-600"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}