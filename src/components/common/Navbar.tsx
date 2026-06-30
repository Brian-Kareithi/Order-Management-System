'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!user || pathname === '/auth/login' || pathname === '/auth/signup') return null;

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  return (
    <nav className="shadow-lg bg-primary">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo/Brand */}
          <Link 
            href={user.role === 'seller' ? '/dashboard' : '/customer'} 
            className="text-xl font-bold text-surface"
          >
            OMS Dashboard
          </Link>
          
          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            {user.role === 'seller' ? (
              <>
                <Link href="/dashboard" className="transition-colors duration-200 hover:text-accent text-surface">
                  Dashboard
                </Link>
        
                <Link href="/dashboard/inventory" className="transition-colors duration-200 hover:text-accent text-surface">
                  Inventory
                </Link>
                <Link href="/dashboard/messages" className="transition-colors duration-200 hover:text-accent text-surface">
                  Messages
                </Link>
                <Link href="/dashboard/payments" className="transition-colors duration-200 hover:text-accent text-surface">
                  Payments
                </Link>
              </>
            ) : (
              <>
                <Link href="/customer" className="transition-colors duration-200 hover:text-accent text-surface">
                  Dashboard
                </Link>
                <Link href="/customer/orders" className="transition-colors duration-200 hover:text-accent text-surface">
                  My Orders
                </Link>
              </>
            )}
            
            {/* User Info & Logout */}
            <div className="flex items-center gap-4 ml-4 pl-4 border-l border-secondary">
              <span className="text-sm text-surface">
                {user.name} 
                <span className="ml-1 text-xs px-2 py-1 rounded-full bg-secondary text-surface">
                  {user.role}
                </span>
              </span>
              <button 
                onClick={handleLogout}
                className="px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 hover:opacity-90 bg-accent text-surface"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
