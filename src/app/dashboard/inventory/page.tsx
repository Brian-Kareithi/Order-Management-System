'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, onSnapshot, deleteDoc, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InventoryItem, InventoryTransaction, StockAlert } from '@/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { 
  Package, 
  AlertTriangle, 
  Plus, 
  Edit, 
  RefreshCw, 
  TrendingDown, 
  TrendingUp,
  History,
  AlertCircle,
  DollarSign,
  Archive,
  Trash2,
  Search,
  X,
  Download,
} from 'lucide-react';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [updateQuantity, setUpdateQuantity] = useState(0);
  const [updateType, setUpdateType] = useState<'restock' | 'adjustment' | 'return'>('restock');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    quantity: 0,
    price: 0,
    cost: 0,
    lowStockThreshold: 20,
    criticalStockThreshold: 10,
    category: '',
    supplier: '',
    supplierContact: '',
    location: '',
    sku: '',
    barcode: ''
  });

  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    criticalStockItems: 0,
    outOfStockItems: 0,
    totalValue: 0,
    totalCost: 0,
    potentialProfit: 0,
    totalSold: 0,
    totalRevenue: 0
  });

  // Categories for filter
  const categories = ['all', ...new Set(inventory.map(item => item.category).filter(Boolean))];

  const applyFilters = (items: InventoryItem[]) => {
    let filtered = [...items];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      switch(statusFilter) {
        case 'low':
          filtered = filtered.filter(item => 
            item.quantity > 0 && item.quantity < (item.lowStockThreshold || 20)
          );
          break;
        case 'critical':
          filtered = filtered.filter(item => 
            item.quantity > 0 && item.quantity < (item.criticalStockThreshold || 10)
          );
          break;
        case 'out':
          filtered = filtered.filter(item => item.quantity === 0);
          break;
        case 'ok':
          filtered = filtered.filter(item => 
            item.quantity >= (item.lowStockThreshold || 20)
          );
          break;
      }
    }

    setFilteredInventory(filtered);
  };

  const calculateStats = (items: InventoryItem[]) => {
    const totalItems = items.length;
    const lowStockItems = items.filter(item => 
      item.quantity > 0 && item.quantity < (item.lowStockThreshold || 20)
    ).length;
    const criticalStockItems = items.filter(item => 
      item.quantity > 0 && item.quantity < (item.criticalStockThreshold || 10)
    ).length;
    const outOfStockItems = items.filter(item => item.quantity === 0).length;
    const totalValue = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    const totalCost = items.reduce((sum, item) => sum + (item.cost || 0) * item.quantity, 0);
    
    // Calculate total sold from transactions
    const totalSold = transactions
      .filter(t => t.type === 'sale')
      .reduce((sum, t) => sum + Math.abs(t.quantity), 0);
    
    const totalRevenue = transactions
      .filter(t => t.type === 'sale')
      .reduce((sum, t) => sum + (Math.abs(t.quantity) * (t.price || 0)), 0);

    setStats({
      totalItems,
      lowStockItems,
      criticalStockItems,
      outOfStockItems,
      totalValue,
      totalCost,
      potentialProfit: totalValue - totalCost,
      totalSold,
      totalRevenue
    });
  };

  useEffect(() => {
    // Set up real-time listeners
    const unsubscribeInventory = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[];
      setInventory(items);
      calculateStats(items);
    });

    const unsubscribeTransactions = onSnapshot(
      query(collection(db, 'inventoryTransactions'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const transactions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as InventoryTransaction[];
        setTransactions(transactions);
      }
    );

    const unsubscribeAlerts = onSnapshot(
      query(collection(db, 'stockAlerts'), where('status', '==', 'active')),
      (snapshot) => {
        const alerts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as StockAlert[];
        setAlerts(alerts);
      }
    );

    setLoading(false);

    return () => {
      unsubscribeInventory();
      unsubscribeTransactions();
      unsubscribeAlerts();
    };
  }, []);

  // Apply filters when search or filters change
  useEffect(() => {
    applyFilters(inventory);
  }, [searchTerm, categoryFilter, statusFilter, inventory]);

  const handleAddItem = async () => {
    if (!newItem.name) {
      toast.error('Please enter a material name');
      return;
    }

    try {
      // Determine initial status
      let status: 'Ok' | 'Low' | 'Critical' | 'Out of Stock' = 'Ok';
      if (newItem.quantity === 0) {
        status = 'Out of Stock';
      } else if (newItem.quantity < (newItem.criticalStockThreshold || 10)) {
        status = 'Critical';
      } else if (newItem.quantity < (newItem.lowStockThreshold || 20)) {
        status = 'Low';
      }

      const itemData = {
        ...newItem,
        status,
        totalValue: newItem.price * newItem.quantity,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'inventory'), itemData);

      // Create initial transaction
      const transaction: Omit<InventoryTransaction, 'id'> = {
        itemId: docRef.id,
        itemName: newItem.name,
        type: 'restock',
        quantity: newItem.quantity,
        previousQuantity: 0,
        newQuantity: newItem.quantity,
        referenceType: 'manual',
        notes: 'Initial stock addition',
        createdBy: 'system',
        createdAt: new Date(),
        price: 0
      };

      await addDoc(collection(db, 'inventoryTransactions'), transaction);

      toast.success('Item added successfully');
      setShowModal(false);
      resetNewItem();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Error adding item');
    }
  };

  const resetNewItem = () => {
    setNewItem({
      name: '',
      description: '',
      quantity: 0,
      price: 0,
      cost: 0,
      lowStockThreshold: 20,
      criticalStockThreshold: 10,
      category: '',
      supplier: '',
      supplierContact: '',
      location: '',
      sku: '',
      barcode: ''
    });
  };

  const handleUpdateStock = async () => {
    if (!selectedItem) return;

    try {
      const previousQuantity = selectedItem.quantity;
      const quantityDiff = updateQuantity - previousQuantity;
      const newQuantity = updateQuantity;

      // Determine new status
      let status: 'Ok' | 'Low' | 'Critical' | 'Out of Stock' = 'Ok';
      if (newQuantity === 0) {
        status = 'Out of Stock';
      } else if (newQuantity < (selectedItem.criticalStockThreshold || 10)) {
        status = 'Critical';
      } else if (newQuantity < (selectedItem.lowStockThreshold || 20)) {
        status = 'Low';
      }

      // Update inventory
      await updateDoc(doc(db, 'inventory', selectedItem.id), {
        quantity: newQuantity,
        status,
        totalValue: newQuantity * (selectedItem.price || 0),
        updatedAt: new Date()
      });

      // Create transaction record
      const transaction: Omit<InventoryTransaction, 'id'> = {
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        type: updateType,
        quantity: quantityDiff,
        previousQuantity,
        newQuantity,
        referenceType: 'manual',
        notes: `Manual ${updateType}${updateType === 'restock' ? ` of ${quantityDiff} units` : ''}`,
        createdBy: 'system',
        createdAt: new Date(),
        price: 0
      };

      await addDoc(collection(db, 'inventoryTransactions'), transaction);

      // Check and create alerts if needed
      await checkAndCreateAlerts(selectedItem.id, selectedItem.name, newQuantity, selectedItem);

      toast.success(`Stock ${updateType === 'restock' ? 'increased' : 'updated'} successfully`);
      setShowUpdateModal(false);
      setSelectedItem(null);
      setUpdateQuantity(0);
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Error updating stock');
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;

    try {
      await deleteDoc(doc(db, 'inventory', selectedItem.id));
      
      toast.success('Item deleted successfully');
      setShowDeleteModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Error deleting item');
    }
  };

  const checkAndCreateAlerts = async (
    itemId: string, 
    itemName: string, 
    quantity: number, 
    item: InventoryItem
  ) => {
    // Check for critical stock
    if (quantity > 0 && quantity < (item.criticalStockThreshold || 10)) {
      const alert: Omit<StockAlert, 'id'> = {
        itemId,
        itemName,
        currentQuantity: quantity,
        threshold: item.criticalStockThreshold || 10,
        type: 'critical',
        status: 'active',
        createdAt: new Date()
      };
      await addDoc(collection(db, 'stockAlerts'), alert);
    }
    // Check for low stock
    else if (quantity > 0 && quantity < (item.lowStockThreshold || 20)) {
      const alert: Omit<StockAlert, 'id'> = {
        itemId,
        itemName,
        currentQuantity: quantity,
        threshold: item.lowStockThreshold || 20,
        type: 'low',
        status: 'active',
        createdAt: new Date()
      };
      await addDoc(collection(db, 'stockAlerts'), alert);
    }
    // Check for out of stock
    else if (quantity === 0) {
      const alert: Omit<StockAlert, 'id'> = {
        itemId,
        itemName,
        currentQuantity: 0,
        threshold: 0,
        type: 'out',
        status: 'active',
        createdAt: new Date()
      };
      await addDoc(collection(db, 'stockAlerts'), alert);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      await updateDoc(doc(db, 'stockAlerts', alertId), {
        status: 'resolved',
        resolvedAt: new Date()
      });
      toast.success('Alert resolved');
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const handleBulkRestock = async () => {
    const lowStockItems = inventory.filter(item => 
      item.quantity < (item.lowStockThreshold || 20)
    );
    
    if (lowStockItems.length === 0) {
      toast.success('All items have sufficient stock');
      return;
    }

    try {
      for (const item of lowStockItems) {
        const targetQuantity = (item.lowStockThreshold || 20) * 2;
        const restockAmount = targetQuantity - item.quantity;
        const newQuantity = item.quantity + restockAmount;
        
        // Update inventory
        await updateDoc(doc(db, 'inventory', item.id), {
          quantity: newQuantity,
          status: 'Ok',
          updatedAt: new Date()
        });

        // Create transaction
        const transaction: Omit<InventoryTransaction, 'id'> = {
          itemId: item.id,
          itemName: item.name,
          type: 'restock',
          quantity: restockAmount,
          previousQuantity: item.quantity,
          newQuantity,
          referenceType: 'manual',
          notes: 'Bulk restock of low items',
          createdBy: 'system',
          createdAt: new Date(),
          price: 0
        };

        await addDoc(collection(db, 'inventoryTransactions'), transaction);
      }
      
      toast.success(`Restocked ${lowStockItems.length} items`);
    } catch (error) {
      console.error('Error bulk restocking:', error);
      toast.error('Error during bulk restock');
    }
  };

  const exportInventory = () => {
    const data = filteredInventory.map(item => ({
      Name: item.name,
      Category: item.category || '',
      SKU: item.sku || '',
      Quantity: item.quantity,
      Price: item.price,
      Cost: item.cost || 0,
      Value: item.price * item.quantity,
      Profit: ((item.price - (item.cost || 0)) * item.quantity),
      Status: getStockStatusText(item),
      Location: item.location || '',
      Supplier: item.supplier || ''
    }));

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStockStatusColor = (item: InventoryItem) => {
    if (item.quantity === 0) return 'bg-red-100 text-red-800 border-red-200';
    if (item.quantity < (item.criticalStockThreshold || 10)) return 'bg-red-100 text-red-800 border-red-200';
    if (item.quantity < (item.lowStockThreshold || 20)) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getStockStatusText = (item: InventoryItem) => {
    if (item.quantity === 0) return 'Out of Stock';
    if (item.quantity < (item.criticalStockThreshold || 10)) return 'Critical';
    if (item.quantity < (item.lowStockThreshold || 20)) return 'Low Stock';
    return 'In Stock';
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setStatusFilter('all');
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen py-8 bg-surface">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 fade-in">
          <div>
            <h1 className="text-3xl font-bold text-primary">Inventory Management</h1>
            <p className="mt-1 text-secondary">Track and manage your raw materials and products</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportInventory}
              className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all duration-200 hover:opacity-90 bg-secondary text-surface"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              onClick={() => setShowTransactionModal(true)}
              className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all duration-200 hover:opacity-90 bg-accent text-surface"
            >
              <History className="h-4 w-4" />
              Transactions
            </button>
            <button
              onClick={handleBulkRestock}
              className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all duration-200 hover:opacity-90 bg-secondary text-surface"
            >
              <RefreshCw className="h-4 w-4" />
              Restock Low
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all duration-200 hover:opacity-90 bg-primary text-surface"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          </div>
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-2 fade-in">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`rounded-lg p-4 border ${
                  alert.type === 'critical' 
                    ? 'bg-red-50 border-red-200' 
                    : alert.type === 'low'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-orange-50 border-orange-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className={`h-5 w-5 ${
                      alert.type === 'critical' 
                        ? 'text-red-600' 
                        : alert.type === 'low'
                        ? 'text-yellow-600'
                        : 'text-orange-600'
                    }`} />
                    <div>
                      <p className="font-medium text-primary">
                        {alert.type === 'critical' ? '⚠️ Critical Stock Alert' : 
                         alert.type === 'low' ? '⚠️ Low Stock Alert' : '⛔ Out of Stock Alert'}
                      </p>
                      <p className="text-sm text-secondary">
                        {alert.itemName} - Current: {alert.currentQuantity} units 
                        {alert.type !== 'out' && ` (Threshold: ${alert.threshold} units)`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    className="px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-90 bg-surface text-secondary"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 fade-in">
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Total Items</p>
                <p className="text-2xl font-bold mt-2 text-primary">{stats.totalItems}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Package className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Low Stock</p>
                <p className="text-2xl font-bold mt-2 text-yellow-500">{stats.lowStockItems}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-500/10">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Critical Stock</p>
                <p className="text-2xl font-bold mt-2 text-red-600">{stats.criticalStockItems}</p>
              </div>
              <div className="p-3 rounded-full bg-red-500/10">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Out of Stock</p>
                <p className="text-2xl font-bold mt-2 text-gray-500">{stats.outOfStockItems}</p>
              </div>
              <div className="p-3 rounded-full bg-gray-500/10">
                <Archive className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Inventory Value</p>
                <p className="text-2xl font-bold mt-2 text-accent">KES {stats.totalValue.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-full bg-accent/10">
                <DollarSign className="h-6 w-6 text-accent" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Potential Profit</p>
                <p className="text-2xl font-bold mt-2 text-green-500">KES {stats.potentialProfit.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Units Sold</p>
                <p className="text-2xl font-bold mt-2 text-secondary">{stats.totalSold}</p>
              </div>
              <div className="p-3 rounded-full bg-secondary/10">
                <TrendingDown className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Sales Revenue</p>
                <p className="text-2xl font-bold mt-2 text-accent">KES {stats.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-full bg-accent/10">
                <DollarSign className="h-6 w-6 text-accent" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 fade-in">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-accent" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, category, supplier, SKU..."
                  className="w-full pl-10 pr-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all border-surface text-primary bg-surface"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full p-2 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all border-surface text-primary bg-surface"
              >
                <option value="all">All Categories</option>
                {categories.filter(c => c !== 'all').map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all border-surface text-primary bg-surface"
              >
                <option value="all">All Status</option>
                <option value="ok">In Stock</option>
                <option value="low">Low Stock</option>
                <option value="critical">Critical</option>
                <option value="out">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {(searchTerm || categoryFilter !== 'all' || statusFilter !== 'all') && (
            <div className="mt-4 pt-4 border-t border-surface">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-secondary">Active Filters:</span>
                {searchTerm && (
                  <span className="px-3 py-1 rounded-full text-sm flex items-center gap-1 bg-primary text-surface">
                    Search: &ldquo;{searchTerm}&rdquo;
                    <button onClick={() => setSearchTerm('')} className="ml-1 hover:opacity-80">×</button>
                  </span>
                )}
                {categoryFilter !== 'all' && (
                  <span className="px-3 py-1 rounded-full text-sm flex items-center gap-1 bg-secondary text-surface">
                    Category: {categoryFilter}
                    <button onClick={() => setCategoryFilter('all')} className="ml-1 hover:opacity-80">×</button>
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className="px-3 py-1 rounded-full text-sm flex items-center gap-1 bg-accent text-surface">
                    Status: {statusFilter}
                    <button onClick={() => setStatusFilter('all')} className="ml-1 hover:opacity-80">×</button>
                  </span>
                )}
                <button onClick={clearFilters} className="text-sm ml-2 font-medium hover:underline text-primary">
                  Clear All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-surface fade-in">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-primary">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-surface">Material</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-surface">Category/SKU</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-surface">Price/Cost</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-surface">Quantity</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-surface">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-surface">Value/Profit</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-surface">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Package className="h-12 w-12 mx-auto mb-3 text-secondary/50" />
                      <p className="font-medium text-primary">No inventory items found</p>
                       <p className="text-sm mt-1 text-secondary">Click &ldquo;Add Item&rdquo; to get started</p>
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-primary">{item.name}</div>
                          {item.description && (
                            <div className="text-xs mt-1 text-secondary">{item.description}</div>
                          )}
                          {item.location && (
                            <div className="text-xs mt-1 text-accent">📍 {item.location}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          {item.category && (
                            <span className="px-2 py-1 rounded-full text-xs bg-surface text-secondary">
                              {item.category}
                            </span>
                          )}
                          {item.sku && (
                            <div className="text-xs mt-1 text-secondary">SKU: {item.sku}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-primary">KES {item.price?.toLocaleString()}</div>
                          <div className="text-xs text-secondary">Cost: KES {item.cost?.toLocaleString() || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-bold text-xl text-primary">{item.quantity}</span>
                          <span className="text-xs ml-1 text-secondary">units</span>
                          {item.supplier && (
                            <div className="text-xs mt-1 text-accent">📦 {item.supplier}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStockStatusColor(item)}`}>
                          {getStockStatusText(item)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-accent">KES {(item.price * item.quantity).toLocaleString()}</div>
                          <div className="text-xs text-green-500">
                            Profit: KES {((item.price - (item.cost || 0)) * item.quantity).toLocaleString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setUpdateQuantity(item.quantity);
                              setUpdateType('restock');
                              setShowUpdateModal(true);
                            }}
                            className="p-2 rounded-lg transition-all duration-200 hover:scale-110 text-accent"
                            title="Restock"
                          >
                            <TrendingUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setUpdateQuantity(item.quantity);
                              setUpdateType('adjustment');
                              setShowUpdateModal(true);
                            }}
                            className="p-2 rounded-lg transition-all duration-200 hover:scale-110 text-secondary"
                            title="Adjust"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 rounded-lg transition-all duration-200 hover:scale-110 text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Item Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4 text-primary">Add New Material</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-secondary">Material Name *</label>
                    <input
                      type="text"
                      value={newItem.name}
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                      className="w-full p-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all border-surface text-primary bg-surface"
                      placeholder="e.g. Gold Clasps"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-secondary">SKU (Optional)</label>
                    <input
                      type="text"
                      value={newItem.sku}
                      onChange={(e) => setNewItem({...newItem, sku: e.target.value})}
                      className="w-full p-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all border-surface text-primary bg-surface"
                      placeholder="e.g. GC-001"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-secondary">Description</label>
                  <textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                    className="w-full p-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all border-surface text-primary bg-surface"
                    placeholder="Brief description of the material"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-secondary">Price (KES) *</label>
                    <input
                      type="number"
                      value={newItem.price}
                      onChange={(e) => setNewItem({...newItem, price: parseInt(e.target.value) || 0})}
                      className="w-full p-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all border-surface text-primary bg-surface"
                      placeholder="e.g. 500"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-secondary">Cost (KES)</label>
                    <input
                      type="number"
                      value={newItem.cost}
                      onChange={(e) => setNewItem({...newItem, cost: parseInt(e.target.value) || 0})}
                      className="w-full p-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all border-surface text-primary bg-surface"
                      placeholder="e.g. 300"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-secondary">Initial Quantity *</label>
                    <input
                      type="number"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})}
                      className="w-full p-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all border-surface text-primary bg-surface"
                      placeholder="e.g. 100"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-secondary">Location</label>
                    <input
                      type="text"
                      value={newItem.location}
                      onChange={(e) => setNewItem({...newItem, location: e.target.value})}
                      className="w-full p-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all border-surface text-primary bg-surface"
                      placeholder="e.g. Shelf A-12"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-secondary">Category</label>
                    <input
                      type="text"
                      value={newItem.category}
                      onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                      className="w-full p-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all border-surface text-primary bg-surface"
                      placeholder="e.g. Findings"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-secondary">Supplier</label>
                    <input
                      type="text"
                      value={newItem.supplier}
                      onChange={(e) => setNewItem({...newItem, supplier: e.target.value})}
                      className="w-full p-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all border-surface text-primary bg-surface"
                      placeholder="e.g. Supplier Name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-secondary">Low Stock Threshold</label>
                    <input
                      type="number"
                      value={newItem.lowStockThreshold}
                      onChange={(e) => setNewItem({...newItem, lowStockThreshold: parseInt(e.target.value) || 20})}
                      className="w-full p-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all border-surface text-primary bg-surface"
                      min="1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-secondary">Critical Threshold</label>
                    <input
                      type="number"
                      value={newItem.criticalStockThreshold}
                      onChange={(e) => setNewItem({...newItem, criticalStockThreshold: parseInt(e.target.value) || 10})}
                      className="w-full p-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all border-surface text-primary bg-surface"
                      min="1"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddItem}
                  className="flex-1 py-3 rounded-lg font-medium transition-all duration-200 hover:opacity-90 bg-primary text-surface"
                >
                  Add Item
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetNewItem();
                  }}
                  className="flex-1 py-3 rounded-lg font-medium transition-all duration-200 hover:opacity-90 bg-surface text-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Update Stock Modal */}
        {showUpdateModal && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-96 max-w-md">
              <h3 className="text-xl font-bold mb-4 text-primary">
                {updateType === 'restock' ? 'Restock Item' : 'Adjust Quantity'}
              </h3>
              
              <div className="mb-4">
                <p className="mb-2 text-secondary">
                  Material: <span className="font-bold text-primary">{selectedItem.name}</span>
                </p>
                <p className="mb-4 text-secondary">
                  Current Quantity: <span className="font-bold text-primary">{selectedItem.quantity}</span>
                </p>
                
                <label className="block text-sm font-medium mb-2 text-secondary">
                  {updateType === 'restock' ? 'New Quantity (after restock)' : 'New Quantity'}
                </label>
                <input
                  type="number"
                  value={updateQuantity}
                  onChange={(e) => setUpdateQuantity(parseInt(e.target.value) || 0)}
                  className="w-full p-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all border-surface text-primary bg-surface"
                  placeholder="Enter new quantity"
                  min="0"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleUpdateStock}
                  className="flex-1 py-3 rounded-lg font-medium transition-all duration-200 hover:opacity-90 bg-accent text-surface"
                >
                  {updateType === 'restock' ? 'Restock' : 'Update'}
                </button>
                <button
                  onClick={() => {
                    setShowUpdateModal(false);
                    setSelectedItem(null);
                  }}
                  className="flex-1 py-3 rounded-lg font-medium transition-all duration-200 hover:opacity-90 bg-surface text-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-96 max-w-md">
              <h3 className="text-xl font-bold mb-4 text-primary">Delete Item</h3>
              
              <p className="mb-4 text-secondary">
                Are you sure you want to delete <span className="font-bold text-primary">{selectedItem.name}</span>?
                This action cannot be undone.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteItem}
                  className="flex-1 py-3 rounded-lg font-medium transition-all duration-200 hover:opacity-90 bg-red-600 text-surface"
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedItem(null);
                  }}
                  className="flex-1 py-3 rounded-lg font-medium transition-all duration-200 hover:opacity-90 bg-surface text-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transactions Modal */}
        {showTransactionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-primary">Transaction History</h3>
                <button
                  onClick={() => setShowTransactionModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5 text-secondary" />
                </button>
              </div>

              <div className="space-y-4">
                {transactions.length === 0 ? (
                  <p className="text-center py-8 text-secondary">No transactions found</p>
                ) : (
                  transactions.map((transaction) => (
                    <div key={transaction.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors border-surface">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              transaction.type === 'sale' ? 'bg-red-100 text-red-800' :
                              transaction.type === 'restock' ? 'bg-green-100 text-green-800' :
                              transaction.type === 'return' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {transaction.type}
                            </span>
                            <span className="font-medium text-primary">{transaction.itemName}</span>
                          </div>
                          <p className="text-sm mt-2 text-secondary">
                            Changed from {transaction.previousQuantity} to {transaction.newQuantity} 
                            ({transaction.quantity > 0 ? '+' : ''}{transaction.quantity} units)
                          </p>
                          {transaction.notes && (
                            <p className="text-sm mt-1 text-accent">Note: {transaction.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-secondary">
                            {new Date(transaction.createdAt).toLocaleString()}
                          </p>
                          {transaction.referenceId && (
                            <p className="text-xs mt-1 text-accent">
                              Ref: {transaction.referenceId}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
