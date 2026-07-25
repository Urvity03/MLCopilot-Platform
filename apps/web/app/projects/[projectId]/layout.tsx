'use client';

import { AppShell } from '../../../components/layout/AppShell';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
