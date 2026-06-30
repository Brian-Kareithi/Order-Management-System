'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order, Message } from '@/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Link from 'next/link';
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle, 
  DollarSign, 
  MessageSquare, 
  Package,
  AlertCircle,
  TrendingUp,
  CreditCard,
  Truck
} from 'lucide-react';
import toast from 'react-hot-toast';

// Define Firebase data structure
interface FirebaseOrder {
  orderId?: string;
  customerId?: string;
  customerName?: string;
  item?: string;
  itemId?: string;
  price?: number;
  quantity?: number;
  amount?: number;
  payment?: string;
  status?: string;
  paymentMethod?: string;
  transactionId?: string;
  mpesaReceipt?: string;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
  notes?: string;
  totalAmount?: number;
  itemCount?: number;
}

export default function CustomerDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalSpent: 0,
    unpaidAmount: 0,
    paidAmount: 0,
    averageOrderValue: 0
  });

  // Redirect if not authenticated or wrong role
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
    if (user?.role === 'seller') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Fetch all dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      
      try {
        setStatsLoading(true);
        console.log('Fetching dashboard data for user:', user.uid);
        
        // Fetch orders
        const ordersData = await fetchOrders();
        
        // Fetch messages
        await fetchMessages();
        
        // Calculate all stats
        calculateStats(ordersData);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load your dashboard data');
      } finally {
        setStatsLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Fetch orders function
  const fetchOrders = async () => {
    try {
      const ordersQuery = query(
        collection(db, 'orders'), 
        where('customerId', '==', user?.uid),
        orderBy('createdAt', 'desc')
      );
      
      const ordersSnapshot = await getDocs(ordersQuery);
      console.log('Orders found:', ordersSnapshot.size);
      
      const ordersData = ordersSnapshot.docs.map(doc => {
        const data = doc.data() as FirebaseOrder;
        
        // Parse createdAt
        let createdAt: Date;
        if (data.createdAt instanceof Timestamp) {
          createdAt = data.createdAt.toDate();
        } else if (data.createdAt) {
          createdAt = new Date(data.createdAt);
        } else {
          createdAt = new Date();
        }

        // Create order item from Firebase structure
        const item = {
          productId: data.itemId || '',
          productName: data.item || 'Unknown Item',
          quantity: data.quantity || 1,
          price: data.price || 0,
          subtotal: (data.price || 0) * (data.quantity || 1)
        };

        // Calculate totals
        const subtotal = item.subtotal;
        const totalAmount = data.amount || subtotal;

        return {
          id: doc.id,
          orderId: data.orderId || doc.id.slice(0, 8),
          customerId: data.customerId || user?.uid,
          customerName: data.customerName || user?.name || 'Customer',
          items: [item],
          itemCount: data.quantity || 1,
          subtotal: subtotal,
          tax: 0,
          shipping: 0,
          totalAmount: totalAmount,
          status: data.status || 'Pending',
          paymentStatus: data.payment || 'Unpaid',
          paymentMethod: data.paymentMethod,
          transactionId: data.transactionId,
          mpesaReceipt: data.mpesaReceipt,
          createdAt: createdAt,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt ? new Date(data.updatedAt) : undefined,
          notes: data.notes || ''
        } as Order;
      });
      
      setOrders(ordersData);
      setRecentOrders(ordersData.slice(0, 5));
      
      return ordersData;
    } catch (error) {
      console.error('Error fetching orders:', error);
      // Fallback to query without orderBy if index error
      const fetchErr = error as { code?: string };
      if (fetchErr.code === 'failed-precondition') {
        console.log('Index missing, fetching without orderBy');
        const fallbackQuery = query(
          collection(db, 'orders'), 
          where('customerId', '==', user?.uid)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        
        const ordersData = fallbackSnapshot.docs.map(doc => {
          const data = doc.data() as FirebaseOrder;
          
          let createdAt: Date;
          if (data.createdAt instanceof Timestamp) {
            createdAt = data.createdAt.toDate();
          } else if (data.createdAt) {
            createdAt = new Date(data.createdAt);
          } else {
            createdAt = new Date();
          }

          const item = {
            productId: data.itemId || '',
            productName: data.item || 'Unknown Item',
            quantity: data.quantity || 1,
            price: data.price || 0,
            subtotal: (data.price || 0) * (data.quantity || 1)
          };

          const totalAmount = data.amount || item.subtotal;

          return {
            id: doc.id,
            orderId: data.orderId || doc.id.slice(0, 8),
            customerId: data.customerId || user?.uid,
            customerName: data.customerName || user?.name || 'Customer',
            items: [item],
            itemCount: data.quantity || 1,
            subtotal: item.subtotal,
            tax: 0,
            shipping: 0,
            totalAmount: totalAmount,
            status: data.status || 'Pending',
            paymentStatus: data.payment || 'Unpaid',
            paymentMethod: data.paymentMethod,
            transactionId: data.transactionId,
            mpesaReceipt: data.mpesaReceipt,
            createdAt: createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt ? new Date(data.updatedAt) : undefined,
            notes: data.notes || ''
          } as Order;
        });
        
        // Sort in memory
        ordersData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setOrders(ordersData);
        setRecentOrders(ordersData.slice(0, 5));
        
        return ordersData;
      }
      throw error;
    }
  };

  // Fetch messages function
  const fetchMessages = async () => {
    try {
      const messagesQuery = query(
        collection(db, 'messages'), 
        where('customerId', '==', user?.uid),
        orderBy('createdAt', 'desc')
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      console.log('Messages found:', messagesSnapshot.size);
      
      const messagesData = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
      })) as Message[];
      
      setMessages(messagesData);
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Fallback to query without orderBy
      const msgErr = error as { code?: string };
      if (msgErr.code === 'failed-precondition') {
        const fallbackQuery = query(
          collection(db, 'messages'), 
          where('customerId', '==', user?.uid)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        
        const messagesData = fallbackSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
        })) as Message[];
        
        // Sort in memory
        messagesData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setMessages(messagesData);
      }
    }
  };

  // Calculate all statistics
  const calculateStats = (ordersData: Order[]) => {
    const totalOrders = ordersData.length;
    
    // Status counts
    const pendingOrders = ordersData.filter(o => 
      o.status.toLowerCase() === 'pending'
    ).length;
    
    const processingOrders = ordersData.filter(o => 
      o.status.toLowerCase() === 'processing'
    ).length;
    
    const completedOrders = ordersData.filter(o => 
      ['completed', 'done'].includes(o.status.toLowerCase())
    ).length;
    
    const cancelledOrders = ordersData.filter(o => 
      o.status.toLowerCase() === 'cancelled'
    ).length;
    
    // Payment amounts
    const paidAmount = ordersData
      .filter(o => o.paymentStatus?.toLowerCase() === 'paid')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    const unpaidAmount = ordersData
      .filter(o => o.paymentStatus?.toLowerCase() === 'unpaid')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    const totalSpent = paidAmount; // Only count paid orders in total spent
    
    // Average order value
    const averageOrderValue = totalOrders > 0 
      ? Math.round(ordersData.reduce((sum, o) => sum + (o.totalAmount || 0), 0) / totalOrders) 
      : 0;

    setStats({
      totalOrders,
      pendingOrders,
      processingOrders,
      completedOrders,
      cancelledOrders,
      totalSpent,
      unpaidAmount,
      paidAmount,
      averageOrderValue
    });
  };

  // Handle sending message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    
    try {
      const messageData = {
        customerId: user?.uid,
        customerName: user?.name,
        customerEmail: user?.email,
        message: newMessage,
        status: 'Unreplied',
        createdAt: new Date()
      };

      await addDoc(collection(db, 'messages'), messageData);
      
      toast.success('Message sent successfully');
      setNewMessage('');
      
      // Refresh messages
      await fetchMessages();
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error sending message');
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString()}`;
  };

  if (loading || statsLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Welcome Header */}
        <div className="mb-8 fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-lg bg-primary">
              <ShoppingBag className="h-6 w-6 text-surface" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">
                Welcome back, {user?.name || 'Customer'}!
              </h1>
              <p className="text-sm mt-1 text-secondary">
                Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
          <p className="text-lg ml-14 text-secondary">
            Here&apos;s what&apos;s happening with your account
          </p>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 fade-in">
          {/* Total Orders */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Total Orders</p>
                <p className="text-3xl font-bold mt-2 text-primary">{stats.totalOrders}</p>
                <p className="text-xs mt-1 text-accent">
                  Avg: {formatCurrency(stats.averageOrderValue)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Package className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          {/* Total Spent */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Total Spent</p>
                <p className="text-3xl font-bold mt-2 text-primary">{formatCurrency(stats.totalSpent)}</p>
                <p className="text-xs mt-1 text-accent">
                  Paid: {formatCurrency(stats.paidAmount)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          {/* Pending Amount */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Pending Payment</p>
                <p className="text-3xl font-bold mt-2 text-yellow-500">{formatCurrency(stats.unpaidAmount)}</p>
                <p className="text-xs mt-1 text-accent">
                  {stats.pendingOrders} orders pending
                </p>
              </div>
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Completion Rate */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Completed</p>
                <p className="text-3xl font-bold mt-2 text-accent">{stats.completedOrders}</p>
                <p className="text-xs mt-1 text-accent">
                  {stats.totalOrders > 0 
                    ? Math.round((stats.completedOrders / stats.totalOrders) * 100) 
                    : 0}% success rate
                </p>
              </div>
              <div className="p-3 rounded-full bg-accent/10">
                <CheckCircle className="h-6 w-6 text-accent" />
              </div>
            </div>
          </div>
        </div>

        {/* Order Status Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 fade-in">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-xs font-medium text-secondary">Pending</p>
            <p className="text-xl font-bold text-yellow-500">{stats.pendingOrders}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-xs font-medium text-secondary">Processing</p>
            <p className="text-xl font-bold text-blue-500">{stats.processingOrders}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-xs font-medium text-secondary">Completed</p>
            <p className="text-xl font-bold text-accent">{stats.completedOrders}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-xs font-medium text-secondary">Cancelled</p>
            <p className="text-xl font-bold text-red-500">{stats.cancelledOrders}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-xs font-medium text-secondary">Unpaid</p>
            <p className="text-xl font-bold text-orange-500">{stats.unpaidAmount > 0 ? 'Yes' : 'No'}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Orders Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow fade-in">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary">
                  <ShoppingBag className="h-4 w-4 text-surface" />
                </div>
                <h2 className="text-xl font-bold text-primary">Recent Orders</h2>
              </div>
              <Link 
                href="/customer/orders" 
                className="text-sm font-medium hover:underline flex items-center gap-1 text-accent"
              >
                View All <TrendingUp className="h-4 w-4" />
              </Link>
            </div>
            
            {recentOrders.length === 0 ? (
              <div className="text-center py-12 rounded-lg bg-surface">
                <ShoppingBag className="h-12 w-12 mx-auto mb-3 text-secondary/50" />
                <p className="mb-3 font-medium text-secondary">No orders yet</p>
                <p className="text-sm mb-4 text-accent">Start shopping to see your orders here</p>
                <Link 
                  href="/customer/new-order" 
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 hover:opacity-90 hover:scale-105 bg-accent text-surface"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Place your first order
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => {
                  const mainItem = order.items && order.items[0] ? order.items[0] : {
                    productName: 'Unknown Item',
                    quantity: 1,
                    price: order.totalAmount
                  };
                  
                  return (
                    <div 
                      key={order.id} 
                      className="border border-surface rounded-lg p-4 transition-all hover:shadow-md hover:border-accent"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold text-primary">Order #{order.orderId}</p>
                            {order.paymentStatus === 'Unpaid' && (
                              <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-600">
                                Action Required
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-secondary">
                            <p>
                              <span className="font-medium">Item:</span> {mainItem.productName}
                            </p>
                            <p>
                              <span className="font-medium">Qty:</span> {mainItem.quantity}
                            </p>
                            <p>
                              <span className="font-medium">Price:</span> {formatCurrency(mainItem.price || 0)}
                            </p>
                            <p>
                              <span className="font-medium">Total:</span> {formatCurrency(order.totalAmount || 0)}
                            </p>
                          </div>
                          <p className="text-xs mt-2 text-accent">
                            {order.createdAt.toLocaleDateString()} at {order.createdAt.toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <span 
                            className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 mb-2 text-surface ${
                              order.status === 'Completed'
                                ? 'bg-accent'
                                : order.status === 'Pending'
                                  ? 'bg-yellow-500'
                                  : 'bg-secondary'
                            }`}
                          >
                            {order.status === 'Pending' && <Clock className="h-3 w-3" />}
                            {order.status === 'Completed' && <CheckCircle className="h-3 w-3" />}
                            {order.status === 'Processing' && <Truck className="h-3 w-3" />}
                            {order.status}
                          </span>
                          <p 
                            className={`text-sm font-bold flex items-center justify-end gap-1 ${
                              order.paymentStatus === 'Paid' ? 'text-accent' : 'text-red-600'
                            }`}
                          >
                            {order.paymentStatus === 'Paid' 
                              ? <CheckCircle className="h-3 w-3" /> 
                              : <AlertCircle className="h-3 w-3" />
                            }
                            {order.paymentStatus}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Messages Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow fade-in">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 rounded-lg bg-primary">
                <MessageSquare className="h-4 w-4 text-surface" />
              </div>
              <h2 className="text-xl font-bold text-primary">Messages</h2>
              {messages.filter(m => m.status === 'Unreplied').length > 0 && (
                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-red-100 text-red-600">
                  {messages.filter(m => m.status === 'Unreplied').length} new
                </span>
              )}
            </div>
            
            <div className="mb-6">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full p-4 border-2 border-surface rounded-lg focus:outline-none focus:ring-2 transition-all resize-none bg-surface text-primary"
                rows={3}
                placeholder="Type your message to the seller..."
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="mt-3 px-6 py-2 rounded-lg font-semibold transition-all duration-200 hover:opacity-90 hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-accent text-surface"
              >
                <MessageSquare className="h-4 w-4" />
                Send Message
              </button>
            </div>
            
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-secondary">
              <Clock className="h-4 w-4" />
              Recent Messages
            </h3>
            
            {messages.length === 0 ? (
              <div className="text-center py-8 rounded-lg bg-surface">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-secondary/50" />
                <p className="text-secondary">No messages yet</p>
                <p className="text-xs mt-1 text-accent">Send a message above to get started</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {messages.slice(0, 3).map((msg) => (
                  <div 
                    key={msg.id} 
                    className="border-b border-surface pb-3 last:border-0 hover:bg-surface p-2 rounded transition-colors"
                  >
                     <p className="italic text-sm text-primary">&ldquo;{msg.message}&rdquo;</p>
                    <div className="flex items-center justify-between mt-2">
                      <span 
                        className={`text-xs font-semibold px-2 py-1 rounded flex items-center gap-1 text-surface ${
                          msg.status === 'Unreplied' ? 'bg-yellow-500' : 'bg-accent'
                        }`}
                      >
                        {msg.status === 'Unreplied' ? <Clock className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                        {msg.status}
                      </span>
                      <span className="text-xs text-secondary">
                        {msg.createdAt?.toLocaleDateString?.()}
                      </span>
                    </div>
                    {msg.reply && (
                      <div className="mt-2 p-2 rounded-lg bg-surface">
                        <p className="text-xs font-medium mb-1 flex items-center gap-1 text-primary">
                          <MessageSquare className="h-3 w-3" />
                          Reply:
                        </p>
                        <p className="text-xs text-secondary">{msg.reply}</p>
                      </div>
                    )}
                  </div>
                ))}
                {messages.length > 3 && (
                  <div className="text-center pt-2">
                    <Link 
                      href="/customer/messages" 
                      className="text-sm font-medium hover:underline inline-flex items-center gap-1 text-accent"
                    >
                      View all {messages.length} messages
                      <TrendingUp className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8 fade-in">
          <Link href="/customer/shop">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-accent hover:scale-105">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-accent/10">
                  <ShoppingBag className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-bold text-primary">Browse Shop</h3>
                  <p className="text-sm text-secondary">Explore products</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/customer/orders">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-accent hover:scale-105">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-secondary/10">
                  <Package className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-bold text-primary">Track Orders</h3>
                  <p className="text-sm text-secondary">View order status</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/customer/new-order">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-accent hover:scale-105">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <ShoppingBag className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-primary">New Order</h3>
                  <p className="text-sm text-secondary">Place order</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/customer/payments">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-accent hover:scale-105">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-accent/10">
                  <CreditCard className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-bold text-primary">Payments</h3>
                  <p className="text-sm text-secondary">Manage payments</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Summary Footer */}
        {orders.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-4 border border-surface fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-secondary">
              <span>
                <span className="font-medium">{orders.length}</span> total orders • 
                <span className="font-medium ml-1">{stats.completedOrders}</span> completed •
                <span className="font-medium ml-1">{stats.pendingOrders}</span> pending
              </span>
              <span className="font-bold text-primary">
                Lifetime value: {formatCurrency(stats.totalSpent)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: var(--color-surface);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--color-secondary);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--color-accent);
        }
        .fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}