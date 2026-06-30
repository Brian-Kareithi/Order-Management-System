'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Message } from '@/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Link from 'next/link';
import { MessageSquare, Send, Clock, CheckCircle, ArrowLeft, User, Mail, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomerMessagesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
    if (user?.role === 'seller') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!user) return;
      
      try {
        setLoadingMessages(true);
        
        // Fetch user's messages
        const messagesQuery = query(
          collection(db, 'messages'), 
          where('customerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const messagesSnapshot = await getDocs(messagesQuery);
        console.log('Messages found:', messagesSnapshot.size);
        
        const messagesData = messagesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
          } as Message;
        });
        
        setMessages(messagesData);
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
      } finally {
        setLoadingMessages(false);
      }
    };

    if (user) {
      fetchMessages();
    }
  }, [user]);

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
      const messagesQuery = query(
        collection(db, 'messages'), 
        where('customerId', '==', user?.uid),
        orderBy('createdAt', 'desc')
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      const messagesData = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
      })) as Message[];
      setMessages(messagesData);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error sending message');
    }
  };

  if (loading || loadingMessages) {
    return <LoadingSpinner />;
  }

  const unrepliedCount = messages.filter(m => m.status === 'Unreplied').length;

  return (
    <div className="min-h-screen py-8 bg-surface">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header with Back Button */}
        <div className="mb-8 fade-in">
          <div className="flex items-center gap-4 mb-4">
            <Link 
              href="/customer"
              className="p-2 rounded-lg bg-surface transition-all duration-200 hover:opacity-80"
            >
              <ArrowLeft className="h-5 w-5 text-secondary" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary">
                <MessageSquare className="h-6 w-6 text-surface" />
              </div>
              <h1 className="text-3xl font-bold text-primary">My Messages</h1>
            </div>
          </div>
          <p className="text-lg ml-14 text-secondary">
            Chat with the seller about your orders
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 fade-in">
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Total Messages</p>
                <p className="text-2xl font-bold mt-2 text-primary">{messages.length}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Unreplied</p>
                <p className="text-2xl font-bold mt-2 text-yellow-500">{unrepliedCount}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Replied</p>
                <p className="text-2xl font-bold mt-2 text-accent">
                  {messages.filter(m => m.status === 'Replied').length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-accent/10">
                <CheckCircle className="h-6 w-6 text-accent" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Send New Message Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24 fade-in">
              <h2 className="text-xl font-bold mb-4 text-primary">Send New Message</h2>
              
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full p-4 border-2 rounded-lg border-surface bg-surface text-primary focus:outline-none focus:ring-2 transition-all mb-4"
                rows={5}
                placeholder="Type your message to the seller..."
              />
              
              <button
                onClick={handleSendMessage}
                className="w-full px-6 py-3 rounded-lg font-semibold bg-accent text-surface transition-all duration-200 hover:opacity-90 flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                Send Message
              </button>

              <div className="mt-6 p-4 rounded-lg bg-surface">
                <p className="text-sm font-medium mb-2 text-primary">Tips:</p>
                <ul className="text-xs space-y-1 text-secondary">
                  <li>• Be clear and specific about your inquiry</li>
                  <li>• Include order numbers if asking about an order</li>
                  <li>• The seller will respond as soon as possible</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Messages History */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-surface fade-in">
              <div className="px-6 py-4 bg-primary">
                <h2 className="text-xl font-bold flex items-center gap-2 text-surface">
                  <MessageSquare className="h-5 w-5" />
                  Message History ({messages.length})
                </h2>
              </div>
              
              <div className="p-6">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 text-secondary/50" />
                    <p className="text-lg mb-2 text-primary">No messages yet</p>
                    <p className="text-sm text-secondary">
                      Send your first message to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {messages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className="border-b border-surface pb-6 last:border-0 last:pb-0"
                      >
                        {/* Customer Message */}
                        <div className="flex gap-3 mb-4">
                          <div className="flex-shrink-0">
                            <div className="p-2 rounded-full bg-surface">
                              <User className="h-4 w-4 text-secondary" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm text-primary">You</span>
                              <span className="text-xs text-secondary">
                                {msg.createdAt?.toLocaleString?.() || 
                                 new Date(msg.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div 
                              className="p-3 rounded-lg inline-block max-w-[80%] bg-surface"
                            >
                              <p className="text-sm text-primary">{msg.message}</p>
                            </div>
                          </div>
                        </div>

                        {/* Seller Reply */}
                        {msg.reply && (
                          <div className="flex gap-3 ml-8">
                            <div className="flex-shrink-0">
                              <div className="p-2 rounded-full bg-accent">
                                <MessageSquare className="h-4 w-4 text-surface" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm text-accent">Seller</span>
                                {msg.repliedAt && (
                                  <span className="text-xs text-secondary">
                                    {new Date(msg.repliedAt).toLocaleString()}
                                  </span>
                                )}
                              </div>
                              <div 
                                className="p-3 rounded-lg inline-block max-w-[80%] bg-accent/10"
                              >
                                <p className="text-sm text-primary">{msg.reply}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Status Badge */}
                        <div className="mt-2 flex justify-end">
                          <span 
                            className={`text-xs font-semibold px-2 py-1 rounded ${
                              msg.status === 'Unreplied' ? 'bg-surface text-secondary' : 'bg-accent text-surface'
                            }`}
                          >
                            {msg.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex justify-center gap-4 fade-in">
          <Link 
            href="/customer/orders"
            className="px-6 py-3 rounded-lg font-medium bg-secondary text-surface transition-all duration-200 hover:opacity-90 flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            View My Orders
          </Link>
          <Link 
            href="/customer/shop"
            className="px-6 py-3 rounded-lg font-medium bg-primary text-surface transition-all duration-200 hover:opacity-90 flex items-center gap-2"
          >
            <ShoppingBag className="h-4 w-4" />
            Browse Shop
          </Link>
        </div>
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
