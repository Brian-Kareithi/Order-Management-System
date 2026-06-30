'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { ShoppingBag, Package, Search, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  price: number;
  category?: string;
  imageUrl?: string;
}

export default function CustomerShopPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
    if (user?.role === 'seller') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'inventory'));
        const items = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          price: doc.data().price || 0
        })) as InventoryItem[];
        setInventory(items.filter(item => item.quantity > 0));
      } catch (error) {
        console.error('Error fetching inventory:', error);
        toast.error('Failed to load products');
      } finally {
        setPageLoading(false);
      }
    };

    if (user) {
      fetchInventory();
    }
  }, [user]);

  const categories = ['all', ...new Set(inventory.map(item => item.category).filter(Boolean) as string[])];

  const filteredItems = inventory.filter(item => {
    const matchesSearch = searchTerm === '' ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading || pageLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen py-8 bg-surface">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8 fade-in">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/customer" className="p-2 rounded-lg transition-all duration-200 hover:opacity-80 bg-surface">
              <ArrowLeft className="h-5 w-5 text-secondary" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary">
                <ShoppingBag className="h-6 w-6 text-surface" />
              </div>
              <h1 className="text-3xl font-bold text-primary">Browse Products</h1>
            </div>
          </div>
          <p className="text-lg ml-14 text-secondary">Explore our available products and place your order</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-accent" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all border-surface text-primary bg-surface"
                />
              </div>
            </div>
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full p-2 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all border-surface text-primary bg-surface"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 mx-auto mb-4 text-secondary/50" />
            <p className="text-lg mb-2 text-primary">No products available</p>
            <p className="mb-6 text-secondary">Check back later for new arrivals</p>
            <Link href="/customer" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-primary text-surface">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 fade-in">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all hover:scale-105 border border-surface">
                <div className="p-6">
                  <div className="p-3 rounded-full w-fit mb-4 bg-accent/10">
                    <Package className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-primary">{item.name}</h3>
                  {item.description && (
                    <p className="text-sm mb-3 line-clamp-2 text-secondary">{item.description}</p>
                  )}
                  {item.category && (
                    <span className="text-xs px-2 py-1 rounded-full bg-surface text-secondary">
                      {item.category}
                    </span>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-secondary">Price</p>
                      <p className="text-xl font-bold text-accent">KES {item.price.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-secondary">Stock</p>
                      <p className={`font-semibold ${item.quantity < 10 ? 'text-red-600' : 'text-primary'}`}>{item.quantity}</p>
                    </div>
                  </div>
                  <Link
                    href={`/customer/new-order?item=${encodeURIComponent(item.name)}&price=${item.price}&id=${item.id}`}
                    className="mt-4 w-full py-2 rounded-lg font-semibold text-sm transition-all duration-200 hover:opacity-90 flex items-center justify-center gap-2 bg-primary text-surface"
                  >
                    <ShoppingBag className="h-4 w-4" /> Order Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {inventory.length > 0 && (
          <div className="mt-6 text-center text-sm text-secondary">
            Showing {filteredItems.length} of {inventory.length} available products
          </div>
        )}
      </div>
    </div>
  );
}
