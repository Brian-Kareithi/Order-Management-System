'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === 'seller') {
        router.push('/dashboard');
      } else {
        router.push('/customer');
      }
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const userCredential = await signIn(email, password);
      
      // Get user role and redirect
      if (userCredential?.user) {
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        const userData = userDoc.data();
        
        if (userData?.role === 'seller') {
          router.push('/dashboard');
        } else {
          router.push('/customer');
        }
      }
    } catch (error) {
      // Error is handled in auth context
      console.error('Login error:', error);
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-1 sm:mb-2 text-gray-900">
              Welcome Back
            </h1>
            <p className="text-sm sm:text-base font-medium text-gray-600">
              Sign in to continue your journey
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Email Field */}
            <div>
              <label className="block font-semibold mb-2 text-sm sm:text-base text-gray-900">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition text-sm sm:text-base bg-gray-50 text-gray-900"
                placeholder="your@email.com"
                required
                disabled={loading}
              />
            </div>
            
            {/* Password Field */}
            <div>
              <label className="block font-semibold mb-2 text-sm sm:text-base text-gray-900">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition text-sm sm:text-base pr-10 sm:pr-12 bg-gray-50 text-gray-900"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 transition text-gray-500 hover:text-gray-700"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  ) : (
                    <EyeIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <Link 
                href="#" 
                className="text-xs sm:text-sm font-medium hover:underline transition text-teal-600"
              >
                Forgot password?
              </Link>
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
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>
          
          {/* Sign Up Link */}
          <p className="text-center mt-6 sm:mt-8 text-sm sm:text-base font-medium text-gray-600">
            Don't have an account?{' '}
            <Link 
              href="/auth/signup" 
              className="font-bold hover:underline transition text-teal-600"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}