'use client';

import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Smartphone, AlertCircle, CheckCircle, Loader, Package, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

interface MpesaPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Record<string, unknown> | null;
  onSuccess: (response: Record<string, unknown>) => void;
}

export default function MpesaPaymentModal({ isOpen, onClose, order, onSuccess }: MpesaPaymentModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'processing' | 'success'>('input');
  const { processPaymentAndDeductStock } = useAuth();

  const validatePhoneNumber = (phone: string) => {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Check if it's a valid Safaricom number (07XX or 01XX)
    if (cleaned.length === 10 && (cleaned.startsWith('07') || cleaned.startsWith('01'))) {
      return '254' + cleaned.substring(1);
    } else if (cleaned.length === 12 && cleaned.startsWith('254')) {
      return cleaned;
    } else if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('1'))) {
      return '254' + cleaned;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    
    const formattedPhone = validatePhoneNumber(phoneNumber);
    if (!formattedPhone) {
      toast.error('Please enter a valid M-PESA phone number (e.g., 0712345678)');
      return;
    }

    setLoading(true);
    setStep('processing');

    try {
      // Generate a transaction code
      const transactionCode = 'MPE' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000);
      
      // Process payment and deduct stock using AuthContext
      const orderItem = order as Record<string, unknown>;
      await processPaymentAndDeductStock(
        {
          productId: orderItem.itemId as string,
          productName: orderItem.item as string,
          quantity: orderItem.quantity as number,
          price: (orderItem.price as number) || ((orderItem.amount as number) || 0) / ((orderItem.quantity as number) || 1),
          amount: orderItem.amount as number,
          phoneNumber: formattedPhone
        },
        'mpesa',
        transactionCode
      );

      setStep('success');
      
      // Show success message
      toast.success(
        <div className="flex flex-col">
          <span className="font-bold">✓ Payment Successful!</span>
          <span className="text-sm">Stock has been deducted from inventory</span>
        </div>,
        { duration: 6000 }
      );
      
      // Wait a bit before closing
      setTimeout(() => {
        onSuccess({ 
          success: true, 
          transactionCode,
          message: 'Payment processed successfully' 
        });
        handleClose();
      }, 3000);
      
    } catch (error: unknown) {
      const mpesaErr = error as { message?: string };
      console.error('Payment error:', error);
      toast.error(mpesaErr.message || 'Failed to process payment. Please try again.');
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('input');
    setPhoneNumber('');
    onClose();
  };

  const getAmount = () => {
    return (order?.amount as number) || 0;
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-bold leading-6 text-primary"
                  >
                    M-PESA Payment
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="text-secondary transition hover:opacity-70"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Order Summary */}
                {order && (() => {
                  const o = order as Record<string, unknown>;
                  return (
                    <div className="mb-6 rounded-xl border border-surface bg-surface p-4">
                      <h4 className="mb-3 font-semibold text-primary">Order Summary</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-secondary">
                            <Package className="h-4 w-4" />
                            <span className="text-sm">Order ID:</span>
                          </div>
                          <span className="font-medium text-primary">#{String(o.orderId ?? '')}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-secondary">Customer:</span>
                          <span className="font-medium text-primary">{String(o.customerName ?? '')}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-secondary">Item:</span>
                          <span className="font-medium text-primary">{String(o.item ?? '')} x{o.quantity as number}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between border-t border-white pt-2">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-accent" />
                            <span className="font-bold text-primary">Total:</span>
                          </div>
                          <span className="text-xl font-bold text-accent">
                            KES {(getAmount() || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {step === 'input' && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-secondary">
                        M-PESA Phone Number
                      </label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-accent" />
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="e.g., 0712345678"
                          className="w-full border-2 border-surface bg-surface py-3 pl-10 pr-4 text-primary placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent rounded-lg transition-all"
                          required
                        />
                      </div>
                      <p className="mt-2 text-xs text-secondary">
                        Enter the M-PESA registered phone number
                      </p>
                    </div>

                    <div className="rounded-lg bg-accent/10 p-4">
                      <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 flex-shrink-0 text-accent" />
                        <div className="text-sm text-secondary">
                          <p className="mb-1 font-medium text-primary">What happens next?</p>
                          <p>An STK push prompt will be sent to your phone. Enter your M-PESA PIN to complete the payment. Stock will be automatically deducted upon success.</p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-3 font-semibold text-surface transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Smartphone className="h-5 w-5" />
                      {loading ? 'Processing...' : 'Pay with M-PESA'}
                    </button>
                  </form>
                )}

                {step === 'processing' && (
                  <div className="py-8 text-center">
                    <Loader className="mx-auto mb-4 h-16 w-16 animate-spin text-accent" />
                    <h3 className="mb-2 text-xl font-bold text-primary">Processing Payment</h3>
                    <p className="text-secondary">
                      Sending STK push to {phoneNumber}...
                    </p>
                    <p className="mt-4 text-sm text-secondary/70">
                      Please wait while we process your payment
                    </p>
                  </div>
                )}

                {step === 'success' && (
                  <div className="py-8 text-center">
                    <CheckCircle className="mx-auto mb-4 h-16 w-16 text-accent" />
                    <h3 className="mb-2 text-xl font-bold text-primary">Payment Successful!</h3>
                    <p className="mb-4 text-secondary">
                      Your payment has been processed and stock has been updated
                    </p>
                    <div className="rounded-lg bg-surface p-4">
                      <p className="text-sm text-primary">
                        <strong>Transaction completed successfully</strong>
                      </p>
                    </div>
                    <p className="mt-4 text-sm text-secondary/70">
                      This window will close automatically...
                    </p>
                  </div>
                )}

                {/* Footer note */}
                <p className="mt-4 text-center text-xs text-secondary/70">
                  Powered by Safaricom M-PESA
                </p>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
