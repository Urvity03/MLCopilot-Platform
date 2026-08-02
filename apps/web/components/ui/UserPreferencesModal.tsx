'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Palette, Bot, Bell, Keyboard, Shield, X,
  Check, Sun, Moon, Laptop, CheckCircle2,
  Sliders, Mail, Volume2, Save, RotateCcw, AlertTriangle
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '../../store/auth';
import {
  usePreferencesStore,
  AccentColorOption,
  FontSizeOption,
  ThemeOption,
} from '../../store/preferences';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type PreferenceTab =
  | 'profile'
  | 'appearance'
  | 'ai'
  | 'notifications'
  | 'shortcuts'
  | 'account';

interface UserPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: PreferenceTab;
}

export function UserPreferencesModal({
  isOpen,
  onClose,
  initialTab = 'appearance',
}: UserPreferencesModalProps) {
  const [activeTab, setActiveTab] = React.useState<PreferenceTab>(initialTab);
  const [showConfirmUnsaved, setShowConfirmUnsaved] = React.useState(false);

  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();

  const prefs = usePreferencesStore();
  const { isDirty, savePreferences, cancelPreferences, syncWithDom } = prefs;

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setShowConfirmUnsaved(false);
      syncWithDom();
    }
  }, [isOpen, initialTab, syncWithDom]);

  // Attempt close with unsaved changes check
  const handleAttemptClose = React.useCallback(() => {
    if (isDirty) {
      setShowConfirmUnsaved(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  // Handle Esc key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showConfirmUnsaved) {
          setShowConfirmUnsaved(false);
        } else {
          handleAttemptClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showConfirmUnsaved, handleAttemptClose]);

  // Save changes handler
  const handleSave = () => {
    savePreferences();
    toast.success('Preferences saved.');
    setShowConfirmUnsaved(false);
  };

  // Save & Close handler
  const handleSaveAndClose = () => {
    savePreferences();
    toast.success('Preferences saved.');
    setShowConfirmUnsaved(false);
    onClose();
  };

  // Discard & Close handler
  const handleDiscardAndClose = () => {
    cancelPreferences();
    setShowConfirmUnsaved(false);
    onClose();
  };

  // Cancel / Reset working changes
  const handleCancelChanges = () => {
    cancelPreferences();
    toast.info('Changes restored to previous saved preferences.');
  };

  // Sync theme with next-themes immediately for visual feedback
  const handleThemeChange = (selectedTheme: ThemeOption) => {
    prefs.setTheme(selectedTheme);
    setTheme(selectedTheme);
  };

  const navTabs: { id: PreferenceTab; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'ai', label: 'AI Preferences', icon: Bot },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
    { id: 'account', label: 'Account & Security', icon: Shield },
  ];

  const userInitials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n: string) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleAttemptClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-4xl h-[620px] max-h-[90vh] bg-[#111217] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl shadow-black/90 overflow-hidden z-50 flex flex-col md:flex-row"
            role="dialog"
            aria-label="User Preferences"
          >
            {/* ── Left Sidebar Navigation ──────────────────────────────────── */}
            <aside className="w-full md:w-64 bg-[#0D0D10] border-r border-[rgba(255,255,255,0.04)] p-4 flex flex-col justify-between shrink-0">
              <div className="space-y-6">
                {/* Header Title */}
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-[var(--primary)]" />
                    <h2 className="text-sm font-bold text-[#F0F0F3]">Preferences</h2>
                  </div>
                  <button
                    onClick={handleAttemptClose}
                    className="md:hidden p-1 rounded-lg text-[#56585E] hover:text-white hover:bg-[#181A20]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Tab List */}
                <nav className="space-y-1" aria-label="Preferences Categories">
                  {navTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer',
                          isActive
                            ? 'bg-[var(--primary)]/15 text-white border border-[var(--primary)]/30 shadow-[0_0_12px_rgba(124,92,252,0.12)]'
                            : 'text-[#8B8D98] hover:text-[#F0F0F3] hover:bg-[#181A20] border border-transparent'
                        )}
                      >
                        <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-[var(--primary)]' : 'text-[#56585E]')} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* User Summary Box */}
              <div className="hidden md:flex items-center gap-3 p-2.5 rounded-xl bg-[#141418] border border-[rgba(255,255,255,0.04)]">
                <div className="h-8 w-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-xs font-bold text-white font-mono shrink-0">
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#F0F0F3] truncate">{user?.full_name}</p>
                  <p className="text-[10px] text-[#56585E] truncate">{user?.email}</p>
                </div>
              </div>
            </aside>

            {/* ── Right Content Panel ─────────────────────────────────────── */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#111217]">
              {/* Top Header */}
              <header className="h-14 border-b border-[rgba(255,255,255,0.04)] px-6 flex items-center justify-between shrink-0 bg-[#0D0D10]/50">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#F0F0F3] capitalize">
                    {navTabs.find((t) => t.id === activeTab)?.label}
                  </h3>
                  {isDirty && (
                    <span className="h-2 w-2 rounded-full bg-[#F5B83D] animate-pulse" title="Unsaved changes" />
                  )}
                </div>
                <button
                  onClick={handleAttemptClose}
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-[#8B8D98] hover:text-white hover:bg-[#181A20] transition-all cursor-pointer"
                >
                  <span className="text-[10px] font-mono bg-[#181A20] border border-[rgba(255,255,255,0.06)] rounded px-1.5 py-0.5">
                    ESC
                  </span>
                  <span>Close</span>
                </button>
              </header>

              {/* Scrollable Tab Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* ── 1. PROFILE TAB ────────────────────────────────────── */}
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#141418] border border-[rgba(255,255,255,0.04)]">
                      <div className="h-16 w-16 rounded-full bg-[var(--primary)] flex items-center justify-center text-xl font-bold text-white font-mono shadow-lg shadow-[var(--primary)]/20 shrink-0">
                        {userInitials}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#F0F0F3]">{user?.full_name || 'Authorized User'}</h4>
                        <p className="text-xs text-[#8B8D98]">{user?.email || 'user@mlcopilot.dev'}</p>
                        <span className="inline-block mt-2 text-[10px] font-mono font-semibold bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 px-2 py-0.5 rounded-md">
                          Enterprise Administrator
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#8B8D98]">Full Name</label>
                        <input
                          type="text"
                          readOnly
                          value={user?.full_name || ''}
                          className="w-full bg-[#181A20] border border-[rgba(255,255,255,0.06)] rounded-xl px-3 py-2 text-xs text-[#F0F0F3] outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#8B8D98]">Email Address</label>
                        <input
                          type="email"
                          readOnly
                          value={user?.email || ''}
                          className="w-full bg-[#181A20] border border-[rgba(255,255,255,0.06)] rounded-xl px-3 py-2 text-xs text-[#F0F0F3] outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── 2. APPEARANCE TAB ─────────────────────────────────── */}
                {activeTab === 'appearance' && (
                  <div className="space-y-6">
                    {/* Theme Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#F0F0F3]">Theme Mode</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: 'system', label: 'System', icon: Laptop },
                          { id: 'light', label: 'Light', icon: Sun },
                          { id: 'dark', label: 'Dark', icon: Moon },
                        ].map((t) => {
                          const Icon = t.icon;
                          const isSelected = prefs.theme === t.id;
                          return (
                            <button
                              key={t.id}
                              onClick={() => handleThemeChange(t.id as ThemeOption)}
                              className={cn(
                                'flex flex-col items-center justify-center p-3.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer gap-2',
                                isSelected
                                  ? 'bg-[var(--primary)]/15 border-[var(--primary)] text-white shadow-[0_0_15px_rgba(124,92,252,0.15)]'
                                  : 'bg-[#141418] border-[rgba(255,255,255,0.06)] text-[#8B8D98] hover:text-white hover:bg-[#181A20]'
                              )}
                            >
                              <Icon className={cn('h-4 w-4', isSelected ? 'text-[var(--primary)]' : 'text-[#56585E]')} />
                              <span>{t.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Accent Color Swatches */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#F0F0F3]">Accent Color</label>
                      <div className="grid grid-cols-5 gap-3">
                        {(
                          [
                            { id: 'purple', label: 'Purple', hex: '#7C5CFC' },
                            { id: 'blue', label: 'Blue', hex: '#3B82F6' },
                            { id: 'emerald', label: 'Emerald', hex: '#10B981' },
                            { id: 'rose', label: 'Rose', hex: '#F43F5E' },
                            { id: 'orange', label: 'Orange', hex: '#F97316' },
                          ] as const
                        ).map((color) => {
                          const isSelected = prefs.accentColor === color.id;
                          return (
                            <button
                              key={color.id}
                              onClick={() => prefs.setAccentColor(color.id as AccentColorOption)}
                              className={cn(
                                'flex flex-col items-center p-2.5 rounded-xl border transition-all cursor-pointer gap-2 text-[11px] font-medium',
                                isSelected
                                  ? 'bg-[#181A20] border-white text-white shadow-lg'
                                  : 'bg-[#141418] border-[rgba(255,255,255,0.06)] text-[#8B8D98] hover:text-white'
                              )}
                            >
                              <span
                                className="h-6 w-6 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                                style={{ backgroundColor: color.hex }}
                              >
                                {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                              </span>
                              <span>{color.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Font Density Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#F0F0F3]">Font Size & Spacing Density</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: 'compact', label: 'Compact', desc: '13px High density' },
                          { id: 'default', label: 'Default', desc: '14px Standard' },
                          { id: 'comfortable', label: 'Comfortable', desc: '15px Relaxed' },
                        ].map((size) => {
                          const isSelected = prefs.fontSize === size.id;
                          return (
                            <button
                              key={size.id}
                              onClick={() => prefs.setFontSize(size.id as FontSizeOption)}
                              className={cn(
                                'flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer',
                                isSelected
                                  ? 'bg-[var(--primary)]/15 border-[var(--primary)] text-white'
                                  : 'bg-[#141418] border-[rgba(255,255,255,0.06)] text-[#8B8D98] hover:text-white hover:bg-[#181A20]'
                              )}
                            >
                              <span className="text-xs font-bold">{size.label}</span>
                              <span className="text-[10px] text-[#56585E] mt-0.5">{size.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── 3. AI PREFERENCES TAB ─────────────────────────────── */}
                {activeTab === 'ai' && (
                  <div className="space-y-6">
                    {/* Default Model */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#F0F0F3]">Default LLM Engine</label>
                      <select
                        value={prefs.defaultModel}
                        onChange={(e) => prefs.setDefaultModel(e.target.value)}
                        className="w-full bg-[#141418] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5 text-xs text-[#F0F0F3] outline-none cursor-pointer focus:border-[var(--primary)]"
                      >
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra Fast Hybrid)</option>
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Reasoning)</option>
                        <option value="ollama-llama3">Ollama Llama 3 (Local Privacy Engine)</option>
                      </select>
                    </div>

                    {/* Toggle Switches */}
                    <div className="space-y-3 pt-2 border-t border-[rgba(255,255,255,0.04)]">
                      {[
                        {
                          key: 'streaming',
                          label: 'Token Streaming',
                          desc: 'Stream LLM tokens dynamically as generated',
                          val: prefs.streaming,
                          set: prefs.setStreaming,
                        },
                        {
                          key: 'autoScroll',
                          label: 'Auto Scroll Messages',
                          desc: 'Automatically scroll chat window on new response',
                          val: prefs.autoScroll,
                          set: prefs.setAutoScroll,
                        },
                        {
                          key: 'markdownRendering',
                          label: 'Rich Markdown Rendering',
                          desc: 'Format code blocks, LaTeX, and GitHub markdown',
                          val: prefs.markdownRendering,
                          set: prefs.setMarkdownRendering,
                        },
                        {
                          key: 'showCitations',
                          label: 'Show RAG Citations',
                          desc: 'Display document source citations for retrieved context',
                          val: prefs.showCitations,
                          set: prefs.setShowCitations,
                        },
                      ].map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center justify-between p-3 rounded-xl bg-[#141418] border border-[rgba(255,255,255,0.04)]"
                        >
                          <div>
                            <p className="text-xs font-semibold text-[#F0F0F3]">{item.label}</p>
                            <p className="text-[11px] text-[#56585E] mt-0.5">{item.desc}</p>
                          </div>
                          <button
                            onClick={() => item.set(!item.val)}
                            className={cn(
                              'w-10 h-5 rounded-full transition-colors relative cursor-pointer',
                              item.val ? 'bg-[var(--primary)]' : 'bg-[#2A2B33]'
                            )}
                          >
                            <span
                              className={cn(
                                'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                                item.val ? 'left-5.5' : 'left-0.5'
                              )}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── 4. NOTIFICATIONS TAB ──────────────────────────────── */}
                {activeTab === 'notifications' && (
                  <div className="space-y-4">
                    {[
                      {
                        label: 'In-App Activity Notifications',
                        desc: 'Alerts for workspace updates, document ingestion, and chat status',
                        val: prefs.inAppNotifications,
                        set: prefs.setInAppNotifications,
                        icon: Bell,
                      },
                      {
                        label: 'Email Reports & Summaries',
                        desc: 'Receive periodic project digests and execution alerts via email',
                        val: prefs.emailNotifications,
                        set: prefs.setEmailNotifications,
                        icon: Mail,
                      },
                      {
                        label: 'Sound Alerts',
                        desc: 'Play subtle audio chime when AI stream response completes',
                        val: prefs.soundAlerts,
                        set: prefs.setSoundAlerts,
                        icon: Volume2,
                      },
                    ].map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-[#141418] border border-[rgba(255,255,255,0.04)]"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="h-4 w-4 text-[var(--primary)]" />
                            <div>
                              <p className="text-xs font-semibold text-[#F0F0F3]">{item.label}</p>
                              <p className="text-[11px] text-[#56585E] mt-0.5">{item.desc}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => item.set(!item.val)}
                            className={cn(
                              'w-10 h-5 rounded-full transition-colors relative cursor-pointer',
                              item.val ? 'bg-[var(--primary)]' : 'bg-[#2A2B33]'
                            )}
                          >
                            <span
                              className={cn(
                                'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                                item.val ? 'left-5.5' : 'left-0.5'
                              )}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── 5. KEYBOARD SHORTCUTS TAB ─────────────────────────── */}
                {activeTab === 'shortcuts' && (
                  <div className="space-y-4">
                    <p className="text-xs text-[#8B8D98]">
                      Global keyboard shortcuts for rapid navigation and productivity:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { keys: ['Ctrl', 'K'], label: 'Open Command Palette' },
                        { keys: ['Esc'], label: 'Close Modals & Clear Selection' },
                        { keys: ['g', 'd'], label: 'Go to Dashboard' },
                        { keys: ['g', 'c'], label: 'Go to AI Chat' },
                        { keys: ['g', 'k'], label: 'Go to Upload Documents' },
                        { keys: ['g', 'm'], label: 'Go to Members' },
                        { keys: ['g', 's'], label: 'Go to Settings' },
                        { keys: ['Alt', '1..9'], label: 'Quick Switch Workspace' },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-xl bg-[#141418] border border-[rgba(255,255,255,0.04)]"
                        >
                          <span className="text-xs font-medium text-[#F0F0F3]">{item.label}</span>
                          <div className="flex gap-1 font-mono">
                            {item.keys.map((k) => (
                              <span
                                key={k}
                                className="text-[10px] font-bold bg-[#181A20] border border-[rgba(255,255,255,0.08)] rounded px-1.5 py-0.5 text-[var(--primary)]"
                              >
                                {k}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── 6. ACCOUNT TAB ────────────────────────────────────── */}
                {activeTab === 'account' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-[#141418] border border-[rgba(255,255,255,0.04)] space-y-2">
                      <h4 className="text-xs font-bold text-[#F0F0F3]">Active Security Session</h4>
                      <p className="text-xs text-[#8B8D98]">
                        Authenticated via JWT bearer session token.
                      </p>
                      <div className="pt-2 flex items-center gap-2 text-[11px] text-[#22C55E]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Session active & validated</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Footer Save & Cancel Action Bar ──────────────────────────── */}
              <footer className="h-16 border-t border-[rgba(255,255,255,0.04)] px-6 flex items-center justify-between shrink-0 bg-[#0D0D10]/80">
                <div className="text-xs text-[#8B8D98]">
                  {isDirty ? (
                    <span className="text-[#F5B83D] font-medium flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Unsaved changes
                    </span>
                  ) : (
                    <span className="text-[#56585E]">All changes saved</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCancelChanges}
                    disabled={!isDirty}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#8B8D98] hover:text-white hover:bg-[#181A20] transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Cancel</span>
                  </button>

                  <button
                    onClick={handleSave}
                    disabled={!isDirty}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary)]/90 transition-all shadow-lg shadow-[var(--primary)]/20 disabled:opacity-40 disabled:pointer-events-none cursor-pointer active:scale-95"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </footer>
            </main>
          </motion.div>

          {/* ── Unsaved Changes Confirmation Modal ──────────────────────────── */}
          <AnimatePresence>
            {showConfirmUnsaved && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowConfirmUnsaved(false)}
                  className="fixed inset-0 bg-black/80 backdrop-blur-md"
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative w-full max-w-md bg-[#141418] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 shadow-2xl z-50 space-y-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[#F5B83D]/10 border border-[#F5B83D]/20 flex items-center justify-center text-[#F5B83D] shrink-0">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Unsaved Changes</h4>
                      <p className="text-xs text-[#8B8D98] mt-1 leading-relaxed">
                        You have unsaved changes in your preferences. Do you want to save them before closing?
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowConfirmUnsaved(false)}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium text-[#8B8D98] hover:bg-[#181A20] hover:text-white transition-all cursor-pointer"
                    >
                      Keep Editing
                    </button>
                    <button
                      onClick={handleDiscardAndClose}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium text-[#FF5C74] bg-[#FF5C74]/10 hover:bg-[#FF5C74]/20 transition-all cursor-pointer"
                    >
                      Discard
                    </button>
                    <button
                      onClick={handleSaveAndClose}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#7C5CFC] hover:bg-[#6C47FF] transition-all shadow-md cursor-pointer"
                    >
                      Save & Close
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
}
