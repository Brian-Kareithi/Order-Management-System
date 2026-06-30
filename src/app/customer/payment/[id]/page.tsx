'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Smartphone, CheckCircle, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface PaymentOrder {
  id: string;
  orderId?: string;
  item?: string;
  items?: Array<{ productId?: string; productName?: string; price?: number }>;
  quantity?: number;
  itemCount?: number;
  amount?: number;
  totalAmount?: number;
  price?: number;
  payment?: string;
  customerId?: string;
  customerName?: string;
  createdAt?: Date;
  updatedAt?: Date;
  userId?: string;
}

export default function PaymentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
    if (user?.role === 'seller') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!user || !params.id) return;
      try {
        const docSnap = await getDoc(doc(db, 'orders', params.id as string));
        if (docSnap.exists()) {
          setOrder({ id: docSnap.id, ...docSnap.data() } as PaymentOrder);
        } else {
          toast.error('Order not found');
          router.push('/customer/orders');
        }
      } catch (error) {
        console.error('Error fetching order:', error);
        toast.error('Failed to load order');
      } finally {
        setPageLoading(false);
      }
    };
    if (user) fetchOrder();
  }, [user, params.id, router]);

  const handleMarkAsPaid = async () => {
    setProcessing(true);
    try {
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'orders', params.id as string), {
        payment: 'Paid',
        updatedAt: new Date()
      });
      toast.success('Payment recorded successfully');
      router.push('/customer/orders');
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast.error('Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleMpesaPayment = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter your M-PESA phone number');
      return;
    }
    setProcessing(true);
    try {
      const { updateDoc } = await import('firebase/firestore');
      const transactionCode = 'MPE' + Date.now().toString().slice(-8);
      await updateDoc(doc(db, 'orders', params.id as string), {
        payment: 'Paid',
        paymentMethod: 'M-Pesa',
        transactionId: transactionCode,
        mpesaReceipt: transactionCode,
        phoneNumber: phoneNumber,
        updatedAt: new Date()
      });
      toast.success('M-PESA payment recorded successfully');
      router.push('/customer/orders');
    } catch (error) {
      console.error('Error processing M-PESA:', error);
      toast.error('Failed to process M-PESA payment');
    } finally {
      setProcessing(false);
    }
  };

  if (loading || pageLoading) return <LoadingSpinner />;
  if (!order) return <LoadingSpinner />;

  const itemName = order.item || (order.items?.[0]?.productName) || 'Unknown';
  const quantity = order.quantity || order.itemCount || 1;
  const amount = order.amount || order.totalAmount || 0;
  const price = order.price || (order.items?.[0]?.price) || 0;

  return (
    <div className="min-h-screen py-8 bg-surface">
      <div className="container mx-auto px-4 max-w-2xl">
        <Link href="/customer/orders" className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-lg transition-all duration-200 hover:opacity-80 text-secondary bg-white">
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </Link>

        <div className="mb-8 fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-lg bg-primary">
              <CreditCard className="h-6 w-6 text-surface" />
            </div>
            <h1 className="text-3xl font-bold text-primary">Payment</h1>
          </div>
          <p className="text-lg ml-14 text-secondary">Order #{order.orderId || params.id}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 border border-surface fade-in">
          <div className="p-4 rounded-lg mb-6 bg-surface">
            <h3 className="font-semibold mb-3 text-primary">Order Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-secondary">Item:</span><span className="font-medium text-primary">{itemName}</span></div>
              <div className="flex justify-between"><span className="text-secondary">Quantity:</span><span className="font-medium text-primary">{quantity}</span></div>
              {price > 0 && <div className="flex justify-between"><span className="text-secondary">Unit Price:</span><span className="font-medium text-primary">KES {price.toLocaleString()}</span></div>}
              <div className="flex justify-between pt-2 mt-2 border-t border-white">
                <span className="font-bold text-primary">Total:</span>
                <span className="text-xl font-bold text-accent">KES {amount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <h3 className="font-semibold mb-4 text-primary">Select Payment Method</h3>

          <div className="space-y-4">
            <button onClick={handleMarkAsPaid} disabled={processing}
              className="w-full p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 flex items-center gap-3 border-accent bg-accent/5">
              <div className="p-2 rounded-full bg-accent/10">
                <DollarSign className="h-5 w-5 text-accent" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-primary">Cash Payment</p>
                <p className="text-sm text-secondary">Mark as paid with cash</p>
              </div>
              <CheckCircle className="h-5 w-5 ml-auto text-accent" />
            </button>

            <div className="p-4 rounded-lg border-2 border-surface">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-primary/10">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-primary">M-PESA</p>
                  <p className="text-sm text-secondary">Pay with mobile money</p>
                </div>
              </div>
              <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter M-PESA phone number (e.g., 0712345678)"
                className="w-full p-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all mb-3 border-surface text-primary bg-surface" />
              <button onClick={handleMpesaPayment} disabled={processing}
                className="w-full py-3 rounded-lg font-semibold transition-all duration-200 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 bg-primary text-surface">
                <Smartphone className="h-4 w-4" /> {processing ? 'Processing...' : 'Pay with M-PESA'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
