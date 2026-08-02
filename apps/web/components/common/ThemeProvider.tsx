'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { usePreferencesStore } from '../../store/preferences';

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      <ThemeSyncBridge />
      {children}
    </NextThemesProvider>
  );
}

/**
 * Bridge component that syncs the Zustand preferences store theme
 * with next-themes on mount/rehydration.
 *
 * Without this, next-themes always boots with defaultTheme="dark"
 * and ignores the user's saved preference (e.g. "light" or "system").
 */
function ThemeSyncBridge() {
  const { setTheme } = useTheme();
  const hasSynced = React.useRef(false);

  React.useEffect(() => {
    if (hasSynced.current) return;

    // Wait for Zustand hydration from localStorage
    const unsubscribe = usePreferencesStore.subscribe((state) => {
      if (!hasSynced.current) {
        const savedTheme = state.saved?.theme || state.theme;
        if (savedTheme) {
          setTheme(savedTheme);
          hasSynced.current = true;
        }
      }
    });

    // Also check immediately in case store is already hydrated
    const currentState = usePreferencesStore.getState();
    const savedTheme = currentState.saved?.theme || currentState.theme;
    if (savedTheme && !hasSynced.current) {
      setTheme(savedTheme);
      hasSynced.current = true;
    }

    return unsubscribe;
  }, [setTheme]);

  return null;
}
