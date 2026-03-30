'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order } from '@/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { 
  ShoppingBag, 
  Edit, 
  CheckCircle, 
  Clock, 
  DollarSign,
  User,
  Package,
  X,
  Search,
  Download
} from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter, paymentFilter]);

  const fetchOrders = async () => {
    try {
      const ordersQuery = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(ordersQuery);
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
      setFilteredOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.item?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'All') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    if (paymentFilter !== 'All') {
      filtered = filtered.filter(order => order.payment === paymentFilter);
    }

    setFilteredOrders(filtered);
  };

  const handleEdit = (order: Order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!selectedOrder) return;
    
    try {
      const updateData: Partial<Order> = {
        status: selectedOrder.status,
        customerName: selectedOrder.customerName,
        payment: selectedOrder.payment
      };
      
      await updateDoc(doc(db, 'orders', selectedOrder.id), updateData);
      
      toast.success('Order updated successfully');
      setShowModal(false);
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Error updating order');
    }
  };

  const handleQuickComplete = async (order: Order) => {
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'Done'
      });
      toast.success('Order marked as completed');
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Error updating order');
    }
  };

  const handleMarkAsPaid = async (order: Order) => {
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        payment: 'Paid'
      });
      toast.success('Order marked as paid');
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Error updating order');
    }
  };

  const exportToCSV = () => {
    const formatDate = (date: any) => {
      if (!date) return 'N/A';
      const d = date.toDate ? date.toDate() : new Date(date);
      return d.toLocaleString();
    };

    const csvData = filteredOrders.map(order => [
      order.orderId,
      order.customerName,
      order.items,
      order.quantity,
      order.amount,
      order.payment,
      order.status,
      formatDate(order.createdAt),
      (order as any).mpesaReceipt || 'N/A'
    ]);

    const headers = ['Order ID', 'Customer Name', 'Item', 'Quantity', 'Amount (KES)', 'Payment Status', 'Order Status', 'Created At', 'MPesa Receipt'];
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Orders exported successfully');
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Done':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentColor = (payment: string) => {
    switch(payment) {
      case 'Paid':
        return 'text-green-600 font-semibold';
      case 'Unpaid':
        return 'text-red-600 font-semibold';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'Done':
        return <CheckCircle className="h-3 w-3" />;
      case 'Pending':
        return <Clock className="h-3 w-3" />;
      default:
        return <Package className="h-3 w-3" />;
    }
  };

  const totalOrders = filteredOrders.length;
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
  const pendingOrders = filteredOrders.filter(order => order.status === 'Pending').length;
  const unpaidOrders = filteredOrders.filter(order => order.payment === 'Unpaid').length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-lg bg-gray-900">
                <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Order Management</h1>
                <p className="text-sm sm:text-base text-gray-500 mt-1">
                  Manage and track customer orders
                </p>
              </div>
            </div>
            <button 
              onClick={() => window.location.href = '/dashboard/orders/new'}
              className="px-4 sm:px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:bg-teal-700 bg-teal-600 text-white text-sm sm:text-base shadow-sm"
            >
              + New Order
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalOrders}</p>
              </div>
              <ShoppingBag className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">KES {totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Pending Orders</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{pendingOrders}</p>
              </div>
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Unpaid Orders</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{unpaidOrders}</p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by order ID, customer name, or item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Done">Done</option>
              </select>
              
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white"
              >
                <option value="All">All Payment</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>
              
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition flex items-center gap-2 text-sm shadow-sm"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      
        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-900">No orders found</p>
              <p className="text-sm mt-1 text-gray-500">
                {searchTerm || statusFilter !== 'All' || paymentFilter !== 'All' 
                  ? "Try adjusting your filters" 
                  : "Click \"New Order\" to create your first order"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{order.orderId}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{order.customerName}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Package className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{order.item}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{order.quantity}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">KES {order.amount?.toLocaleString()}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm ${getPaymentColor(order.payment)}`}>
                          {order.payment}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(order)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Edit order"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {order.status !== 'Done' && (
                            <button
                              onClick={() => handleQuickComplete(order)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded transition"
                              title="Mark as complete"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          {order.payment !== 'Paid' && (
                            <button
                              onClick={() => handleMarkAsPaid(order)}
                              className="p-1 text-teal-600 hover:bg-teal-50 rounded transition"
                              title="Mark as paid"
                            >
                              <DollarSign className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {showModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 sm:p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Edit Order</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>
              
              <div className="p-5 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={selectedOrder.customerName}
                    onChange={(e) => setSelectedOrder({...selectedOrder, customerName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Status
                  </label>
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => setSelectedOrder({...selectedOrder, status: e.target.value as 'Pending' | 'Done'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Payment Status
                  </label>
                  <select
                    value={selectedOrder.payment}
                    onChange={(e) => setSelectedOrder({...selectedOrder, payment: e.target.value as 'Paid' | 'Unpaid'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white"
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>
              
              <div className="p-5 sm:p-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={handleSave}
                  className="flex-1 py-2 rounded-lg font-semibold transition-all duration-200 hover:bg-teal-700 bg-teal-600 text-white text-sm shadow-sm"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-lg font-semibold transition-all duration-200 hover:bg-gray-100 bg-gray-100 text-gray-700 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
