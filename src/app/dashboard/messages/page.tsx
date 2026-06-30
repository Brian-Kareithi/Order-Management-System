'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Message } from '@/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { 
  MessageSquare, 
  Send, 
  CheckCircle, 
  User, 
  Clock,
  AlertCircle,
  Mail,
  MailOpen,
  Reply,
  X
} from 'lucide-react';

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState<'all' | 'unreplied' | 'replied'>('all');

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const messagesQuery = query(
        collection(db, 'messages'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(messagesQuery);
      const messagesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(messagesData);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMessage = (message: Message) => {
    setSelectedMessage(message);
    setReplyText('');
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }
    
    try {
      await updateDoc(doc(db, 'messages', selectedMessage.id), {
        status: 'Replied',
        reply: replyText,
        repliedAt: new Date()
      });
      
      toast.success(
        <div className="flex flex-col">
          <span className="font-bold">✓ Reply Sent!</span>
          <span className="text-sm">Your reply has been sent to {selectedMessage.customerName}</span>
        </div>
      );
      
      setSelectedMessage(null);
      setReplyText('');
      fetchMessages();
    } catch (error) {
      toast.error('Error sending reply');
    }
  };

  const handleMarkReplied = async (message: Message) => {
    try {
      await updateDoc(doc(db, 'messages', message.id), {
        status: 'Replied',
        repliedAt: new Date()
      });
      toast.success('Message marked as replied');
      fetchMessages();
    } catch (error) {
      toast.error('Error updating message');
    }
  };

  const filteredMessages = messages.filter(message => {
    if (filter === 'unreplied') return message.status === 'Unreplied';
    if (filter === 'replied') return message.status === 'Replied';
    return true;
  });

  const unrepliedCount = messages.filter(m => m.status === 'Unreplied').length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen py-8 bg-surface">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8 fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-lg bg-primary">
              <MessageSquare className="h-6 w-6 text-surface" />
            </div>
            <h1 className="text-3xl font-bold text-primary">Customer Messages</h1>
          </div>
          <p className="text-lg ml-14 text-secondary">
            Manage and respond to customer inquiries
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 fade-in">
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
                <AlertCircle className="h-6 w-6 text-yellow-600" />
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
                <MailOpen className="h-6 w-6 text-accent" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 fade-in">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              filter === 'all' 
                ? 'bg-primary text-surface shadow-lg' 
                : 'bg-surface text-secondary hover:opacity-80'
            }`}
          >
            All Messages
          </button>
          <button
            onClick={() => setFilter('unreplied')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              filter === 'unreplied' 
                ? 'bg-yellow-500 text-white shadow-lg' 
                : 'bg-surface text-secondary hover:opacity-80'
            }`}
          >
            Unreplied ({unrepliedCount})
          </button>
          <button
            onClick={() => setFilter('replied')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              filter === 'replied' 
                ? 'bg-accent text-white shadow-lg' 
                : 'bg-surface text-secondary hover:opacity-80'
            }`}
          >
            Replied
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Messages List */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-surface fade-in">
            <div className="p-4 bg-primary">
              <h2 className="text-lg font-bold flex items-center gap-2 text-surface">
                <MessageSquare className="h-5 w-5" />
                Messages ({filteredMessages.length})
              </h2>
            </div>
            
            {filteredMessages.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 mx-auto mb-3 text-secondary/50" />
                <p className="font-medium text-primary">No messages found</p>
                <p className="text-sm mt-1 text-secondary">
                  {filter !== 'all' ? 'Try changing your filter' : 'No messages available'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-surface">
                {filteredMessages.map((message) => (
                  <div 
                    key={message.id} 
                    onClick={() => handleSelectMessage(message)}
                    className={`p-4 cursor-pointer transition-all hover:bg-gray-50 ${
                      selectedMessage?.id === message.id 
                        ? 'border-l-4 border-l-accent' 
                        : ''
                    } ${message.status === 'Unreplied' ? 'bg-yellow-50/30' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="p-2 rounded-full bg-surface">
                          <User className="h-5 w-5 text-secondary" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-semibold truncate text-primary">
                            {message.customerName}
                          </h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            message.status === 'Unreplied' 
                              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
                              : 'bg-green-100 text-green-800 border border-green-200'
                          }`}>
                            {message.status}
                          </span>
                        </div>
                        <p className="text-sm italic line-clamp-2 mb-2 text-secondary">
                          &ldquo;{message.message}&rdquo;
                        </p>
                        <div className="flex items-center gap-2 text-xs text-accent">
                          <Clock className="h-3 w-3" />
                          {message.createdAt?.toLocaleDateString()}
                        </div>
                        {message.reply && (
                          <div className="mt-2 p-2 rounded-lg bg-surface">
                            <p className="text-xs font-medium mb-1 text-primary">Reply:</p>
                             <p className="text-xs italic text-secondary">&ldquo;{message.reply}&rdquo;</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Reply Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-surface fade-in">
            {selectedMessage ? (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-accent">
                    <Reply className="h-5 w-5 text-surface" />
                  </div>
                  <h2 className="text-xl font-bold text-primary">
                    Reply to {selectedMessage.customerName}
                  </h2>
                </div>
                
                <div className="mb-6 p-4 rounded-lg bg-surface">
                  <p className="text-sm font-medium mb-2 text-primary">Original Message:</p>
                  <p className="italic text-secondary">"{selectedMessage.message}"</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-accent">
                    <Clock className="h-3 w-3" />
          
                  </div>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2 text-secondary">
                    Your Reply
                  </label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full p-4 border-2 border-surface rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 transition-all"
                    rows={5}
                    placeholder="Type your reply here..."
                  />
                </div>
  
                <div className="flex gap-3">
                  <button
                    onClick={handleReply}
                    disabled={!replyText.trim()}
                    className="flex-1 py-3 rounded-lg font-semibold transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-accent text-surface"
                  >
                    <Send className="h-4 w-4" />
                    Send Reply
                  </button>
                  <button
                    onClick={() => handleMarkReplied(selectedMessage)}
                    className="flex-1 py-3 rounded-lg font-semibold transition-all duration-200 hover:opacity-90 flex items-center justify-center gap-2 bg-secondary text-surface"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark Replied
                  </button>
                </div>

                <button
                  onClick={() => setSelectedMessage(null)}
                  className="mt-3 w-full py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-80 flex items-center justify-center gap-2 text-secondary"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="p-4 rounded-full mx-auto w-16 h-16 flex items-center justify-center mb-4 bg-surface">
                  <MessageSquare className="h-8 w-8 text-secondary" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-primary">No Message Selected</h3>
                <p className="text-sm text-secondary">
                  Select a message from the list to reply
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Footer */}
        {messages.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-4 border border-surface fade-in">
            <div className="flex flex-wrap justify-between items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-primary">Response Rate:</span>
                <span className="px-2 py-1 rounded-full text-xs bg-surface text-secondary">
                  {Math.round((messages.filter(m => m.status === 'Replied').length / messages.length) * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-primary">Avg Response Time:</span>
                <span className="px-2 py-1 rounded-full text-xs bg-surface text-secondary">
                  Simulated
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-primary">Pending:</span>
                <span className="px-2 py-1 rounded-full text-xs bg-yellow-500 text-white">
                  {unrepliedCount}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}