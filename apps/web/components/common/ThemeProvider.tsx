'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return empty placeholder with dark theme variables to prevent flashes
    return <div className="dark min-h-screen bg-[#09090b]">{children}</div>;
  }

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      forcedTheme="dark" // Ensures dark-first SaaS aesthetic is preserved
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
