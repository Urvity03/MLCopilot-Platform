'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Palette, Bell, Keyboard, Bot, Shield, LogOut,
  ChevronDown, Sliders
} from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { useAuth } from '../../hooks/useAuth';
import { PreferenceTab } from '../ui/UserPreferencesModal';

interface UserProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPreferences: (tab: PreferenceTab) => void;
}

export function UserProfileDropdown({
  isOpen,
  onClose,
  onOpenPreferences,
}: UserProfileDropdownProps) {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Outside click & Esc key handler
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

  const userInitials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n: string) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const menuItems: { id: PreferenceTab; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
    { id: 'ai', label: 'AI Preferences', icon: Bot },
    { id: 'account', label: 'Account', icon: Shield },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="absolute right-0 top-full mt-2 w-64 bg-[#111217] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl shadow-black/80 z-50 py-1.5 overflow-hidden"
          role="menu"
          aria-label="User Menu"
        >
          {/* Profile Header Item */}
          <div className="px-3.5 py-3 border-b border-[rgba(255,255,255,0.04)] bg-[#0D0D10]/50 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[var(--primary)] flex items-center justify-center text-xs font-bold text-white font-mono shrink-0 shadow-md shadow-[var(--primary)]/20">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#F0F0F3] truncate">{user?.full_name}</p>
              <p className="text-[10px] text-[#8B8D98] truncate">{user?.email}</p>
            </div>
          </div>

          {/* Preferences Navigation List */}
          <div className="py-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onClose();
                    onOpenPreferences(item.id);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-medium text-[#8B8D98] hover:text-[#F0F0F3] hover:bg-[#181A20] transition-colors text-left cursor-pointer group"
                >
                  <Icon className="h-4 w-4 text-[#56585E] group-hover:text-[var(--primary)] transition-colors" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Logout Divider & Action */}
          <div className="border-t border-[rgba(255,255,255,0.04)] pt-1 mt-1">
            <button
              onClick={() => {
                onClose();
                logout();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-medium text-[#8B8D98] hover:text-[#FF5C74] hover:bg-[#FF5C74]/10 transition-colors text-left cursor-pointer group"
            >
              <LogOut className="h-4 w-4 text-[#56585E] group-hover:text-[#FF5C74] transition-colors" />
              <span>Log out</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
