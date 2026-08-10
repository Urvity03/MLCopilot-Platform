'use client';

import * as React from 'react';
import {
  Menu, LogOut, LayoutDashboard, MessageSquare,
  Users, Settings as SettingsIcon, ChevronDown,
  Bell, FolderPlus, HelpCircle, Command, Search,
  FileText, Compass, X, FolderKanban
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/auth';
import { useProjects } from '../../hooks/useProjects';
import { ProtectedRoute } from '../common/ProtectedRoute';
import { CommandPalette } from '../ui/command-palette';
import { NewProjectModal } from '../dashboard/NewProjectModal';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationDropdown } from './NotificationDropdown';
import { UserProfileDropdown } from './UserProfileDropdown';
import { UserPreferencesModal, PreferenceTab } from '../ui/UserPreferencesModal';
import { MLCopilotLogo } from '../branding/MLCopilotLogo';
import { cn } from '@/lib/utils';

// ─── Sidebar Nav Item ──────────────────────────────────────────────────────────
function SidebarNavItem({
  href,
  icon: Icon,
  label,
  isActive,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
        isActive
          ? 'text-[var(--foreground)] bg-[var(--primary)]/10'
          : 'text-[#8B8D98] hover:text-[var(--foreground)] hover:bg-[#181A20]'
      )}
    >
      {/* Active left accent bar */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-[var(--primary)]" />
      )}
      <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-[var(--primary)]' : 'text-[#56585E]')} />
      <span>{label}</span>
    </Link>
  );
}

// ─── Section Label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-[#56585E] uppercase tracking-wider px-3 py-2 select-none">
      {children}
    </p>
  );
}

// ─── AppShell ──────────────────────────────────────────────────────────────────
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const { projects } = useProjects();

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = React.useState(false);
  const [commandCenterOpen, setCommandCenterOpen] = React.useState(false);
  const [newProjectOpen, setNewProjectOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = React.useState(0);
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);
  const [preferencesModalOpen, setPreferencesModalOpen] = React.useState(false);
  const [preferencesTab, setPreferencesTab] = React.useState<PreferenceTab>('appearance');

  const projectRef = React.useRef<HTMLDivElement>(null);
  const desktopProfileTriggerRef = React.useRef<HTMLButtonElement>(null);
  const mobileProfileTriggerRef = React.useRef<HTMLButtonElement>(null);

  // Extract active project from URL params
  const projectId = params?.projectId as string | undefined;
  const activeProject = React.useMemo(() => {
    if (!projectId) return null;
    return projects.find((p) => p.id === projectId) || null;
  }, [projects, projectId]);

  const selectProject = (id: string | null) => {
    setProjectDropdownOpen(false);
    if (id) {
      router.push(`/projects/${id}`);
    } else {
      router.push('/dashboard');
    }
  };

  // Click outside handler for project dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectRef.current && !projectRef.current.contains(event.target as Node)) {
        setProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Keyboard navigation shortcuts (g d, g c, g k, etc.)
  React.useEffect(() => {
    let keysPressed = '';
    const handleShortcuts = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      if (e.key === 'g') {
        keysPressed = 'g';
        return;
      }
      if (keysPressed === 'g') {
        if (e.key === 'd') {
          e.preventDefault();
          router.push('/dashboard');
        } else if (e.key === 'c' && activeProject?.id) {
          e.preventDefault();
          router.push(`/projects/${activeProject.id}/chat`);
        } else if (e.key === 'k' && activeProject?.id) {
          e.preventDefault();
          router.push(`/projects/${activeProject.id}/uploads`);
        } else if (e.key === 's' && activeProject?.id) {
          e.preventDefault();
          router.push(`/projects/${activeProject.id}/settings`);
        } else if (e.key === 'm' && activeProject?.id) {
          e.preventDefault();
          router.push(`/projects/${activeProject.id}/members`);
        }
        keysPressed = '';
      } else {
        keysPressed = '';
      }
    };
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [activeProject, router]);

  // Alt + Number quick project switcher
  React.useEffect(() => {
    const handleProjectSwitchShortcuts = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.altKey && e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        if (index === 0) {
          e.preventDefault();
          selectProject(null);
        } else if (projects[index - 1]) {
          e.preventDefault();
          selectProject(projects[index - 1].id);
        }
      }
    };
    window.addEventListener('keydown', handleProjectSwitchShortcuts);
    return () => window.removeEventListener('keydown', handleProjectSwitchShortcuts);
  }, [projects, router]);

  // Close mobile menu on navigate
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // ─── Breadcrumbs ───────────────────────────────────────────────────────────
  const breadcrumbs = React.useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    const crumbs = [];

    if (segments[0] === 'dashboard') {
      crumbs.push({ name: 'Dashboard', href: '/dashboard' });
    } else if (segments[0] === 'projects') {
      crumbs.push({ name: 'Projects', href: '/dashboard' });
      if (activeProject) {
        crumbs.push({ name: activeProject.name, href: `/projects/${activeProject.id}` });
      }
      if (segments[2]) {
        const pageName = segments[2].charAt(0).toUpperCase() + segments[2].slice(1);
        const mappedName = pageName === 'Uploads' ? 'Documents' : pageName === 'Chat' ? 'AI Chat' : pageName;
        crumbs.push({ name: mappedName, href: pathname });
      }
    } else {
      crumbs.push({ name: 'Home', href: '/dashboard' });
    }

    return crumbs;
  }, [pathname, activeProject]);

  // ─── Navigation Items ──────────────────────────────────────────────────────
  const workspaceItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  ];

  const projectItems = activeProject
    ? [
        { name: 'Overview', href: `/projects/${activeProject.id}`, icon: Compass },
        { name: 'Documents', href: `/projects/${activeProject.id}/uploads`, icon: FileText },
        { name: 'AI Chat', href: `/projects/${activeProject.id}/chat`, icon: MessageSquare },
        { name: 'Members', href: `/projects/${activeProject.id}/members`, icon: Users },
        { name: 'Settings', href: `/projects/${activeProject.id}/settings`, icon: SettingsIcon },
      ]
    : [];

  // User initials
  const userInitials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n: string) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#09090B] text-zinc-100 flex overflow-hidden">
        {/* ────────────────────────────────────────────────────────────────── */}
        {/* Desktop Sidebar                                                   */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <aside className="hidden lg:flex lg:flex-col w-[240px] h-screen sticky top-0 z-40 bg-[#0D0D10] border-r border-[rgba(255,255,255,0.04)] flex-shrink-0">
          {/* ── Top Section ─────────────────────────────────────────────── */}
          <div className="p-4 space-y-3 shrink-0">
            {/* Workspace Switcher */}
            <div ref={projectRef} className="relative">
              <button
                onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-transparent hover:bg-[#181A20] transition-all duration-200 text-left group"
                aria-haspopup="listbox"
                aria-expanded={projectDropdownOpen}
              >
                <MLCopilotLogo size={26} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#F0F0F3] truncate">MLCopilot</p>
                  {activeProject && (
                    <p className="text-[10px] text-[#56585E] truncate flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] shrink-0" />
                      {activeProject.name}
                    </p>
                  )}
                </div>
                <ChevronDown className={cn(
                  'h-3.5 w-3.5 text-[#56585E] shrink-0 transition-transform duration-200',
                  projectDropdownOpen && 'rotate-180'
                )} />
              </button>

              {/* Workspace Dropdown */}
              <AnimatePresence>
                {projectDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute left-0 right-0 mt-1 bg-[#141418] border border-[rgba(255,255,255,0.06)] rounded-xl shadow-2xl shadow-black/50 z-50 py-1.5 overflow-hidden max-h-64 overflow-y-auto"
                  >
                    <button
                      onClick={() => selectProject(null)}
                      className="w-full text-left px-3 py-2 text-xs text-[#8B8D98] hover:bg-[#1C1D24] hover:text-[#F0F0F3] transition-all font-medium flex items-center justify-between cursor-pointer"
                    >
                      <span>Personal Dashboard</span>
                      <span className="text-[9px] bg-[#1C1D24] border border-[rgba(255,255,255,0.06)] rounded px-1.5 text-[#56585E] font-mono">⌥1</span>
                    </button>
                    {projects.length > 0 && <div className="h-px bg-[rgba(255,255,255,0.04)] mx-2 my-1" />}
                    {projects.map((p, pIdx) => (
                      <button
                        key={p.id}
                        onClick={() => selectProject(p.id)}
                        className={cn(
                          'w-full text-left px-3 py-2 text-xs font-medium transition-all flex items-center justify-between cursor-pointer',
                          activeProject?.id === p.id
                            ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-bold'
                            : 'text-[#8B8D98] hover:bg-[#1C1D24] hover:text-[#F0F0F3]'
                        )}
                      >
                        <span className="flex items-center gap-2 truncate">
                          {activeProject?.id === p.id && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] shrink-0" />
                          )}
                          <span className="truncate">{p.name}</span>
                        </span>
                        {pIdx < 8 && (
                          <span className="text-[9px] bg-[#1C1D24] border border-[rgba(255,255,255,0.06)] rounded px-1.5 text-[#56585E] font-mono">⌥{pIdx + 2}</span>
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Search Trigger */}
            <button
              onClick={() => setCommandCenterOpen(true)}
              className="w-full flex items-center justify-between bg-[#111217] border border-[rgba(255,255,255,0.06)] rounded-xl py-2 px-3 text-sm text-[#56585E] cursor-pointer hover:border-[rgba(255,255,255,0.1)] hover:bg-[#151720] transition-all duration-200 group"
            >
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-[#56585E] group-hover:text-[#8B8D98] transition-colors" />
                <span>Search...</span>
              </div>
            </button>
          </div>

          {/* ── Main Navigation (scrollable) ────────────────────────────── */}
          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1" aria-label="Main Navigation">
            {/* WORKSPACE Section */}
            <SectionLabel>Workspace</SectionLabel>
            <div className="space-y-0.5">
              {workspaceItems.map((item) => (
                <SidebarNavItem
                  key={item.name}
                  href={item.href}
                  icon={item.icon}
                  label={item.name}
                  isActive={pathname === item.href}
                />
              ))}

              {/* Projects list */}
              {projects.length > 0 && (
                <div className="pt-1">
                  {projects.slice(0, 5).map((p) => {
                    const isActive = activeProject?.id === p.id && pathname === `/projects/${p.id}`;
                    return (
                      <Link
                        key={p.id}
                        href={`/projects/${p.id}`}
                        className={cn(
                          'relative flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[13px] font-medium transition-all duration-200 truncate',
                          activeProject?.id === p.id
                            ? 'text-[#F0F0F3]'
                            : 'text-[#56585E] hover:text-[#8B8D98] hover:bg-[#181A20]'
                        )}
                      >
                        <span className={cn(
                          'h-1.5 w-1.5 rounded-full shrink-0 transition-colors',
                          activeProject?.id === p.id ? 'bg-[var(--primary)]' : 'bg-[#2A2B33]'
                        )} />
                        <span className="truncate">{p.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PROJECT Section (only when inside a project) */}
            {activeProject && (
              <>
                <div className="pt-4" />
                <SectionLabel>Project</SectionLabel>
                <div className="space-y-0.5">
                  {projectItems.map((item) => (
                    <SidebarNavItem
                      key={item.name}
                      href={item.href}
                      icon={item.icon}
                      label={item.name}
                      isActive={pathname === item.href}
                    />
                  ))}
                </div>
              </>
            )}
          </nav>

          {/* ── Bottom Section ──────────────────────────────────────────── */}
          <div className="shrink-0 border-t border-[rgba(255,255,255,0.04)] p-3 space-y-1">
            {/* User Profile */}
            <div className="relative">
              <button
                ref={desktopProfileTriggerRef}
                onClick={() => setUserDropdownOpen((prev) => !prev)}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-[#181A20] transition-all duration-200 cursor-pointer text-left group"
                aria-label="User Profile Menu"
                aria-expanded={!mobileMenuOpen && userDropdownOpen}
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#7C5CFC] to-[#5B3FD9] flex items-center justify-center text-[11px] text-white font-bold font-mono shrink-0">
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#F0F0F3] truncate">{user?.full_name}</p>
                  <p className="text-[11px] text-[#56585E] truncate">{user?.email}</p>
                </div>
              </button>

              <UserProfileDropdown
                isOpen={!mobileMenuOpen && userDropdownOpen}
                onClose={() => setUserDropdownOpen(false)}
                onOpenPreferences={(tab) => {
                  setPreferencesTab(tab);
                  setPreferencesModalOpen(true);
                }}
                triggerRef={desktopProfileTriggerRef}
              />
            </div>

            {/* Help Link */}
            <a
              href="#"
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#56585E] hover:text-[#8B8D98] hover:bg-[#181A20] transition-all duration-200"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Help & Support</span>
            </a>

            {/* Logout */}
            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#8B8D98] hover:text-[#FF5C74] hover:bg-[#FF5C74]/5 transition-all duration-200 cursor-pointer"
              title="Logout Account"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log out</span>
            </button>
          </div>
        </aside>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* Content Wrapper                                                   */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {/* ── Top Bar ─────────────────────────────────────────────────── */}
          <header className="h-14 border-b border-[rgba(255,255,255,0.04)] flex items-center justify-between px-6 bg-[#09090B]/80 backdrop-blur-xl sticky top-0 z-30 shrink-0">
            {/* Left: Mobile Menu + Breadcrumbs */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-1.5 rounded-lg text-[#56585E] hover:text-[#F0F0F3] hover:bg-[#181A20] lg:hidden transition-all"
                aria-label="Open mobile menu"
              >
                <Menu className="h-4.5 w-4.5" />
              </button>

              {/* Breadcrumbs */}
              <nav className="hidden lg:flex items-center gap-2 text-sm select-none" aria-label="Breadcrumbs">
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.href}>
                    {idx > 0 && <span className="text-[#2A2B33]">/</span>}
                    <Link
                      href={crumb.href}
                      className={cn(
                        'transition-colors truncate max-w-[160px]',
                        idx === breadcrumbs.length - 1
                          ? 'text-[#F0F0F3] font-medium cursor-default pointer-events-none'
                          : 'text-[#56585E] hover:text-[#8B8D98]'
                      )}
                    >
                      {crumb.name}
                    </Link>
                  </React.Fragment>
                ))}
              </nav>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {/* Notification Bell Dropdown Wrapper */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 rounded-lg text-[#56585E] hover:text-[#F0F0F3] hover:bg-[#181A20] transition-all relative cursor-pointer"
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                >
                  <Bell className="h-4 w-4" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[var(--primary)] ring-2 ring-[#09090B]" />
                  )}
                </button>

                <NotificationDropdown
                  isOpen={notificationsOpen}
                  onClose={() => setNotificationsOpen(false)}
                  onUnreadCountChange={setUnreadNotificationsCount}
                />
              </div>

              {/* Quick Ingest */}
              <button
                onClick={() => setNewProjectOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-xs font-semibold text-white px-3.5 py-2 transition-all shadow-lg shadow-[var(--primary)]/10 cursor-pointer active:scale-[0.98]"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                <span>New Project</span>
              </button>
            </div>
          </header>

          {/* ── Main Content ────────────────────────────────────────────── */}
          <main className="flex-1 overflow-y-auto relative z-10" style={{ scrollBehavior: 'smooth' }}>
            {children}
          </main>
        </div>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* Mobile Slide-Over Drawer                                          */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
              />

              {/* Drawer */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-[280px] bg-[#0D0D10] border-r border-[rgba(255,255,255,0.04)] flex flex-col h-full z-50"
                role="dialog"
                aria-modal="true"
                aria-label="Mobile Navigation"
              >
                {/* Mobile Header */}
                <div className="h-14 flex items-center justify-between px-4 border-b border-[rgba(255,255,255,0.04)] shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#7C5CFC] to-[#6C47FF] flex items-center justify-center text-white font-mono text-xs font-bold">
                      M
                    </span>
                    <span className="text-sm font-semibold text-[#F0F0F3]">MLCopilot</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg text-[#56585E] hover:text-[#F0F0F3] hover:bg-[#181A20] transition-all"
                    aria-label="Close navigation"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Mobile Search */}
                <div className="p-3 shrink-0">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setCommandCenterOpen(true);
                    }}
                    className="w-full flex items-center justify-between bg-[#111217] border border-[rgba(255,255,255,0.06)] rounded-xl py-2 px-3 text-sm text-[#56585E] cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Search className="h-3.5 w-3.5" />
                      <span>Search...</span>
                    </div>
                  </button>
                </div>

                {/* Mobile Navigation */}
                <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1" aria-label="Mobile Navigation">
                  <SectionLabel>Workspace</SectionLabel>
                  <div className="space-y-0.5">
                    {workspaceItems.map((item) => (
                      <SidebarNavItem
                        key={item.name}
                        href={item.href}
                        icon={item.icon}
                        label={item.name}
                        isActive={pathname === item.href}
                      />
                    ))}
                  </div>

                  {activeProject && (
                    <>
                      <div className="pt-4" />
                      <SectionLabel>Project</SectionLabel>
                      <div className="space-y-0.5">
                        {projectItems.map((item) => (
                          <SidebarNavItem
                            key={item.name}
                            href={item.href}
                            icon={item.icon}
                            label={item.name}
                            isActive={pathname === item.href}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </nav>

                {/* Mobile Footer */}
                <div className="shrink-0 border-t border-[rgba(255,255,255,0.04)] p-3 space-y-1">
                  <div className="relative">
                    <button
                      ref={mobileProfileTriggerRef}
                      onClick={() => setUserDropdownOpen((prev) => !prev)}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-[#181A20] transition-all duration-200 cursor-pointer text-left group"
                      aria-label="User Profile Menu"
                      aria-expanded={mobileMenuOpen && userDropdownOpen}
                    >
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#7C5CFC] to-[#5B3FD9] flex items-center justify-center text-[11px] text-white font-bold font-mono shrink-0">
                        {userInitials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#F0F0F3] truncate">{user?.full_name}</p>
                        <p className="text-[11px] text-[#56585E] truncate">{user?.email}</p>
                      </div>
                    </button>

                    <UserProfileDropdown
                      isOpen={mobileMenuOpen && userDropdownOpen}
                      onClose={() => setUserDropdownOpen(false)}
                      onOpenPreferences={(tab) => {
                        setPreferencesTab(tab);
                        setPreferencesModalOpen(true);
                      }}
                      triggerRef={mobileProfileTriggerRef}
                    />
                  </div>
                  <button
                    onClick={() => logout()}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#8B8D98] hover:text-[#FF5C74] hover:bg-[#FF5C74]/5 transition-all cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Log out</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* Global Command Palette                                            */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <CommandPalette
          open={commandCenterOpen}
          onOpenChange={setCommandCenterOpen}
          onOpenNewProject={() => setNewProjectOpen(true)}
        />

        {/* Global New Project Modal */}
        <NewProjectModal isOpen={newProjectOpen} onClose={() => setNewProjectOpen(false)} />

        {/* Global User Preferences Modal */}
        <UserPreferencesModal
          isOpen={preferencesModalOpen}
          onClose={() => setPreferencesModalOpen(false)}
          initialTab={preferencesTab}
        />
      </div>
    </ProtectedRoute>
  );
}
