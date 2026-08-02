'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeOption = 'system' | 'light' | 'dark';
export type AccentColorOption = 'purple' | 'blue' | 'emerald' | 'rose' | 'orange';
export type FontSizeOption = 'compact' | 'default' | 'comfortable';

export interface PreferencesData {
  theme: ThemeOption;
  accentColor: AccentColorOption;
  fontSize: FontSizeOption;

  defaultModel: string;
  streaming: boolean;
  autoScroll: boolean;
  markdownRendering: boolean;
  showCitations: boolean;

  emailNotifications: boolean;
  inAppNotifications: boolean;
  soundAlerts: boolean;
}

export interface UserPreferencesState extends PreferencesData {
  // Dirty state tracking for Modal Save mechanism
  saved: PreferencesData;
  isDirty: boolean;

  // Individual setters (update draft / visual preview immediately)
  setTheme: (theme: ThemeOption) => void;
  setAccentColor: (color: AccentColorOption) => void;
  setFontSize: (size: FontSizeOption) => void;
  setDefaultModel: (model: string) => void;
  setStreaming: (enabled: boolean) => void;
  setAutoScroll: (enabled: boolean) => void;
  setMarkdownRendering: (enabled: boolean) => void;
  setShowCitations: (enabled: boolean) => void;
  setEmailNotifications: (enabled: boolean) => void;
  setInAppNotifications: (enabled: boolean) => void;
  setSoundAlerts: (enabled: boolean) => void;

  // Save & Cancel actions
  savePreferences: () => void;
  cancelPreferences: () => void;
  syncWithDom: () => void;
}

export const ACCENT_COLOR_MAP: Record<AccentColorOption, { primary: string; ring: string; sidebarPrimary: string; sidebarAccent: string }> = {
  purple: { primary: '#7C5CFC', ring: 'rgba(124, 92, 252, 0.4)', sidebarPrimary: '#7C5CFC', sidebarAccent: 'rgba(124, 92, 252, 0.08)' },
  blue: { primary: '#3B82F6', ring: 'rgba(59, 130, 246, 0.4)', sidebarPrimary: '#3B82F6', sidebarAccent: 'rgba(59, 130, 246, 0.08)' },
  emerald: { primary: '#10B981', ring: 'rgba(16, 185, 129, 0.4)', sidebarPrimary: '#10B981', sidebarAccent: 'rgba(16, 185, 129, 0.08)' },
  rose: { primary: '#F43F5E', ring: 'rgba(244, 63, 94, 0.4)', sidebarPrimary: '#F43F5E', sidebarAccent: 'rgba(244, 63, 94, 0.08)' },
  orange: { primary: '#F97316', ring: 'rgba(249, 115, 22, 0.4)', sidebarPrimary: '#F97316', sidebarAccent: 'rgba(249, 115, 22, 0.08)' },
};

const DEFAULT_PREFS: PreferencesData = {
  theme: 'dark',
  accentColor: 'purple',
  fontSize: 'default',

  defaultModel: 'gemini-2.5-flash',
  streaming: true,
  autoScroll: true,
  markdownRendering: true,
  showCitations: true,

  emailNotifications: true,
  inAppNotifications: true,
  soundAlerts: false,
};

export function applyPreferencesToDom(prefs: PreferencesData) {
  if (typeof document === 'undefined') return;

  // Apply Accent Color CSS Root Variables
  const colorObj = ACCENT_COLOR_MAP[prefs.accentColor] || ACCENT_COLOR_MAP.purple;
  document.documentElement.style.setProperty('--primary', colorObj.primary);
  document.documentElement.style.setProperty('--ring', colorObj.ring);
  document.documentElement.style.setProperty('--sidebar-primary', colorObj.sidebarPrimary);
  document.documentElement.style.setProperty('--sidebar-accent', colorObj.sidebarAccent);

  // Apply Font Density Attribute
  document.documentElement.setAttribute('data-density', prefs.fontSize);
}

function checkIsDirty(current: PreferencesData, saved: PreferencesData): boolean {
  return (
    current.theme !== saved.theme ||
    current.accentColor !== saved.accentColor ||
    current.fontSize !== saved.fontSize ||
    current.defaultModel !== saved.defaultModel ||
    current.streaming !== saved.streaming ||
    current.autoScroll !== saved.autoScroll ||
    current.markdownRendering !== saved.markdownRendering ||
    current.showCitations !== saved.showCitations ||
    current.emailNotifications !== saved.emailNotifications ||
    current.inAppNotifications !== saved.inAppNotifications ||
    current.soundAlerts !== saved.soundAlerts
  );
}

export const usePreferencesStore = create<UserPreferencesState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_PREFS,
      saved: { ...DEFAULT_PREFS },
      isDirty: false,

      setTheme: (theme) => {
        const next = { ...get(), theme };
        applyPreferencesToDom(next);
        set({ theme, isDirty: checkIsDirty(next, get().saved) });
      },

      setAccentColor: (accentColor) => {
        const next = { ...get(), accentColor };
        applyPreferencesToDom(next);
        set({ accentColor, isDirty: checkIsDirty(next, get().saved) });
      },

      setFontSize: (fontSize) => {
        const next = { ...get(), fontSize };
        applyPreferencesToDom(next);
        set({ fontSize, isDirty: checkIsDirty(next, get().saved) });
      },

      setDefaultModel: (defaultModel) => {
        const next = { ...get(), defaultModel };
        set({ defaultModel, isDirty: checkIsDirty(next, get().saved) });
      },

      setStreaming: (streaming) => {
        const next = { ...get(), streaming };
        set({ streaming, isDirty: checkIsDirty(next, get().saved) });
      },

      setAutoScroll: (autoScroll) => {
        const next = { ...get(), autoScroll };
        set({ autoScroll, isDirty: checkIsDirty(next, get().saved) });
      },

      setMarkdownRendering: (markdownRendering) => {
        const next = { ...get(), markdownRendering };
        set({ markdownRendering, isDirty: checkIsDirty(next, get().saved) });
      },

      setShowCitations: (showCitations) => {
        const next = { ...get(), showCitations };
        set({ showCitations, isDirty: checkIsDirty(next, get().saved) });
      },

      setEmailNotifications: (emailNotifications) => {
        const next = { ...get(), emailNotifications };
        set({ emailNotifications, isDirty: checkIsDirty(next, get().saved) });
      },

      setInAppNotifications: (inAppNotifications) => {
        const next = { ...get(), inAppNotifications };
        set({ inAppNotifications, isDirty: checkIsDirty(next, get().saved) });
      },

      setSoundAlerts: (soundAlerts) => {
        const next = { ...get(), soundAlerts };
        set({ soundAlerts, isDirty: checkIsDirty(next, get().saved) });
      },

      savePreferences: () => {
        const current = get();
        const newSaved: PreferencesData = {
          theme: current.theme,
          accentColor: current.accentColor,
          fontSize: current.fontSize,
          defaultModel: current.defaultModel,
          streaming: current.streaming,
          autoScroll: current.autoScroll,
          markdownRendering: current.markdownRendering,
          showCitations: current.showCitations,
          emailNotifications: current.emailNotifications,
          inAppNotifications: current.inAppNotifications,
          soundAlerts: current.soundAlerts,
        };
        applyPreferencesToDom(newSaved);
        set({ saved: newSaved, isDirty: false });
      },

      cancelPreferences: () => {
        const saved = get().saved || DEFAULT_PREFS;
        applyPreferencesToDom(saved);
        set({
          ...saved,
          isDirty: false,
        });
      },

      syncWithDom: () => {
        const current = get();
        applyPreferencesToDom(current);
      },
    }),
    {
      name: 'mlcopilot-user-preferences',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // If saved is not initialized properly, default it
          const savedData: PreferencesData = state.saved || {
            theme: state.theme,
            accentColor: state.accentColor,
            fontSize: state.fontSize,
            defaultModel: state.defaultModel,
            streaming: state.streaming,
            autoScroll: state.autoScroll,
            markdownRendering: state.markdownRendering,
            showCitations: state.showCitations,
            emailNotifications: state.emailNotifications,
            inAppNotifications: state.inAppNotifications,
            soundAlerts: state.soundAlerts,
          };
          state.saved = savedData;
          state.isDirty = false;
          applyPreferencesToDom(state);
        }
      },
    }
  )
);
