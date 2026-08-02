'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Inbox, ShieldCheck } from 'lucide-react';
import { client } from '../../services/client';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  type?: 'info' | 'success' | 'warning';
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export function NotificationDropdown({
  isOpen,
  onClose,
  onUnreadCountChange,
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Fetch notifications from backend API gracefully
  const fetchNotifications = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await client.get('/notifications');
      const data = Array.isArray(res.data) ? res.data : [];
      setNotifications(data);
      const unread = data.filter((n: NotificationItem) => !n.read).length;
      onUnreadCountChange?.(unread);
    } catch {
      // Backend has no active notifications endpoint -> default to empty list
      setNotifications([]);
      onUnreadCountChange?.(0);
    } finally {
      setIsLoading(false);
    }
  }, [onUnreadCountChange]);

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Click outside to close
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    onUnreadCountChange?.(0);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#111217] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl shadow-black/80 z-50 overflow-hidden"
          role="dialog"
          aria-label="Notifications Dropdown"
        >
          {/* Dropdown Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)] bg-[#0D0D10]/80">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[var(--primary)]" />
              <span className="text-xs font-bold text-[#F0F0F3]">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/30 text-[10px] font-mono px-1.5 py-0.2 rounded-full font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>

            {notifications.length > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-medium text-[#8B8D98] hover:text-[var(--primary)] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="h-3 w-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications Body */}
          <div className="max-h-80 overflow-y-auto p-2">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-[#56585E]">
                <div className="h-4 w-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Checking notifications...
              </div>
            ) : notifications.length === 0 ? (
              /* REQUIRED EMPTY STATE */
              <div className="py-10 px-6 text-center flex flex-col items-center justify-center space-y-3">
                <div className="h-11 w-11 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] shadow-inner">
                  <Inbox className="h-5 w-5" />
                </div>
                <div className="space-y-1 max-w-[240px]">
                  <h4 className="text-xs font-bold text-[#F0F0F3]">No notifications yet</h4>
                  <p className="text-[11px] text-[#8B8D98] leading-relaxed">
                    We&apos;ll notify you when something important happens.
                  </p>
                </div>
              </div>
            ) : (
              /* Real Notification List */
              <div className="space-y-1">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl transition-all border ${
                      item.read
                        ? 'bg-transparent border-transparent text-[#8B8D98]'
                        : 'bg-[var(--primary)]/5 border-[var(--primary)]/20 text-[#F0F0F3]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold">{item.title}</p>
                      <span className="text-[9px] text-[#56585E] font-mono shrink-0">
                        {new Date(item.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8B8D98] mt-1 leading-snug">{item.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dropdown Footer */}
          <div className="px-4 py-2 bg-[#0D0D10] border-t border-[rgba(255,255,255,0.04)] flex items-center justify-between text-[10px] text-[#56585E]">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-[#22C55E]" />
              System Status: Operational
            </span>
            <span className="font-mono">Esc to close</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
