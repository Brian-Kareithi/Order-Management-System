'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Link from 'next/link';
import { CreditCard, CheckCircle, Clock, Search, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentOrder {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  item: string;
  quantity: number;
  amount: number;
  price: number;
  payment: string;
  status: string;
  paymentMethod?: string;
  transactionId?: string;
  mpesaReceipt?: string;
  createdAt: Date;
}

export default function CustomerPaymentsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<PaymentOrder[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
    if (user?.role === 'seller') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!user) return;
      try {
        const ordersQuery = query(
          collection(db, 'orders'),
          where('customerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(ordersQuery);
        const data = snapshot.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            orderId: d.orderId || doc.id.slice(0, 8),
            customerId: d.customerId || user.uid,
            customerName: d.customerName || user.name,
            item: d.item || 'Unknown',
            quantity: d.quantity || 1,
            amount: d.amount || (d.totalAmount || 0),
            price: d.price || 0,
            payment: d.payment || d.paymentStatus || 'Unpaid',
            status: d.status || 'Pending',
            paymentMethod: d.paymentMethod,
            transactionId: d.transactionId,
            mpesaReceipt: d.mpesaReceipt,
            createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.createdAt)
          } as PaymentOrder;
        });
        setOrders(data);
        setFilteredOrders(data);
      } catch (error) {
        console.error('Error fetching payments:', error);
        toast.error('Failed to load payment records');
      } finally {
        setPageLoading(false);
      }
    };
    if (user) fetchPayments();
  }, [user]);

  useEffect(() => {
    let filtered = [...orders];
    if (searchTerm) {
      filtered = filtered.filter(o =>
        o.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.item.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(o => o.payment.toLowerCase() === paymentFilter);
    }
    setFilteredOrders(filtered);
  }, [searchTerm, paymentFilter, orders]);

  const formatDate = (date: Date) => {
    if (!date) return 'N/A';
    try {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return 'N/A'; }
  };

  const totalPaid = filteredOrders.filter(o => o.payment === 'Paid').reduce((s, o) => s + o.amount, 0);
  const totalUnpaid = filteredOrders.filter(o => o.payment === 'Unpaid').reduce((s, o) => s + o.amount, 0);

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
                <CreditCard className="h-6 w-6 text-surface" />
              </div>
              <h1 className="text-3xl font-bold text-primary">My Payments</h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 fade-in">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-sm font-medium text-secondary">Total Orders</p>
            <p className="text-2xl font-bold mt-2 text-primary">{orders.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-sm font-medium text-secondary">Paid</p>
            <p className="text-2xl font-bold mt-2 text-accent">KES {totalPaid.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-sm font-medium text-secondary">Pending Payment</p>
            <p className="text-2xl font-bold mt-2 text-yellow-500">KES {totalUnpaid.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-accent" />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by order ID or item..." className="w-full pl-10 pr-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all border-surface text-primary bg-surface" />
              </div>
            </div>
            <div>
              <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full p-2 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all border-surface text-primary bg-surface">
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-surface fade-in">
          <div className="px-6 py-4 bg-primary">
            <h2 className="text-xl font-bold flex items-center gap-2 text-surface">
              <CreditCard className="h-5 w-5" /> Payment Records ({filteredOrders.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-secondary">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-secondary">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-secondary">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-secondary">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-secondary">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <CreditCard className="h-12 w-12 mx-auto mb-3 text-secondary/50" />
                      <p className="font-medium text-primary">No payment records found</p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-primary">#{order.orderId}</td>
                      <td className="px-6 py-4 text-secondary">{order.item} x{order.quantity}</td>
                      <td className="px-6 py-4 font-bold text-accent">KES {order.amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                          order.payment === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.payment === 'Paid' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {order.payment}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary">{formatDate(order.createdAt)}</td>
                      <td className="px-6 py-4">
                        {order.payment === 'Unpaid' ? (
                          <Link href={`/customer/payment/${order.id}`}
                            className="px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-90 bg-accent text-surface">
                            Pay Now
                          </Link>
                        ) : (
                          <span className="text-sm flex items-center gap-1 text-accent">
                            <CheckCircle className="h-4 w-4" /> Paid
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
