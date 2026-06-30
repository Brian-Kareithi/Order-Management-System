'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ShoppingBag, Package, ArrowLeft, User } from 'lucide-react';
import Link from 'next/link';

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    item: '',
    itemId: '',
    quantity: 1,
    amount: 0,
    price: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customerSnap, inventorySnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('role', '==', 'customer'))),
          getDocs(collection(db, 'inventory'))
        ]);
        setCustomers(customerSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
        setInventory(inventorySnap.docs.map(d => ({ id: d.id, ...d.data(), price: d.data().price || 0 } as InventoryItem)));
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    setFormData({ ...formData, customerId, customerName: customer?.name || '' });
  };

  const handleItemChange = (itemName: string) => {
    const item = inventory.find(i => i.name === itemName);
    setFormData({
      ...formData,
      item: itemName,
      itemId: item?.id || '',
      price: item?.price || 0,
      amount: (item?.price || 0) * formData.quantity
    });
  };

  const handleQuantityChange = (qty: number) => {
    const item = inventory.find(i => i.name === formData.item);
    setFormData({
      ...formData,
      quantity: qty,
      amount: (item?.price || formData.price) * qty
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const orderId = 'ORD' + Math.floor(100 + Math.random() * 900).toString();
      await addDoc(collection(db, 'orders'), {
        orderId,
        customerId: formData.customerId,
        customerName: formData.customerName,
        item: formData.item,
        itemId: formData.itemId,
        quantity: formData.quantity,
        price: formData.price,
        amount: formData.amount,
        status: 'Pending',
        payment: 'Unpaid',
        createdAt: new Date()
      });
      toast.success('Order created successfully');
      router.push('/dashboard/orders');
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Error creating order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Link href="/dashboard/orders"
          className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-lg transition-all duration-200 hover:bg-gray-100 text-secondary">
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-lg bg-primary">
              <ShoppingBag className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-primary">New Order</h1>
          </div>
          <p className="text-lg ml-14 text-secondary">Create a new order for a customer</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 border border-surface">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block font-semibold mb-2 flex items-center gap-2 text-secondary">
                <User className="h-4 w-4 text-accent" /> Customer
              </label>
              <select value={formData.customerId} onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-white text-primary"
                required>
                <option value="">Select a customer</option>
                {customers.filter(c => c.name).map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-2 flex items-center gap-2 text-secondary">
                <Package className="h-4 w-4 text-accent" /> Item
              </label>
              <select value={formData.item} onChange={(e) => handleItemChange(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-white text-primary"
                required>
                <option value="">Select an item</option>
                {inventory.map(item => (
                  <option key={item.id} value={item.name}>
                    {item.name} - KES {item.price.toLocaleString()} (Stock: {item.quantity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-2 text-secondary">Quantity</label>
              <input type="number" value={formData.quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-primary"
                min="1" required />
            </div>

            {formData.price > 0 && (
              <div className="p-4 rounded-lg bg-surface">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-secondary">Unit Price:</span>
                  <span className="font-semibold text-primary">KES {formData.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-secondary">Quantity:</span>
                  <span className="font-semibold text-primary">{formData.quantity}</span>
                </div>
                <div className="border-t mt-2 pt-2 border-surface">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-primary">Total:</span>
                    <span className="text-xl font-bold text-accent">KES {formData.amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading || !formData.customerId || !formData.item}
              className="w-full py-4 rounded-lg font-semibold text-lg transition-all duration-200 hover:bg-accent/80 disabled:opacity-50 bg-accent text-white shadow-lg">
              {loading ? 'Creating Order...' : 'Create Order'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
