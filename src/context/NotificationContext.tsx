import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { NotificationItem } from '../types';
import { api, getStoredToken } from '../lib/api';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from 'lucide-react';

export interface Toast {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'warning' | 'alert' | 'info';
}

interface NotificationContextType {
  toasts: Toast[];
  removeToast: (id: string) => void;
  notifications: NotificationItem[];
  unreadCount: number;
  showToast: (toast: Omit<Toast, 'id'>) => void;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const fetchNotifications = useCallback(async () => {
    if (!getStoredToken()) return;
    try {
      const data = await api.getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (e) {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // 10s poll
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => (prev || []).map(n => (n.id === id ? { ...n, read: true } : n)));
    } catch (e) {}
  };

  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => (prev || []).map(n => ({ ...n, read: true })));
    } catch (e) {}
  };

  const unreadCount = (notifications || []).filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        removeToast,
        notifications: notifications || [],
        unreadCount,
        showToast,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}

      {/* Toast Render Overlay */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none">
        {(toasts || []).map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl border backdrop-blur-xl shadow-2xl flex items-start gap-3 transform transition-all duration-300 animate-in slide-in-from-bottom-5 ${
              toast.type === 'success'
                ? 'bg-zinc-900/95 border-emerald-500/40 text-emerald-100 shadow-emerald-950/40'
                : toast.type === 'warning'
                ? 'bg-zinc-900/95 border-amber-500/40 text-amber-100 shadow-amber-950/40'
                : toast.type === 'alert'
                ? 'bg-zinc-900/95 border-pink-500/50 text-pink-100 shadow-pink-950/50'
                : 'bg-zinc-900/95 border-violet-500/40 text-violet-100 shadow-violet-950/40'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {toast.type === 'alert' && <AlertOctagon className="w-5 h-5 text-pink-400" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-violet-400" />}
            </div>
            <div className="flex-1 text-sm">
              <div className="font-semibold">{toast.title}</div>
              {toast.message && <div className="text-xs opacity-90 mt-0.5">{toast.message}</div>}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
