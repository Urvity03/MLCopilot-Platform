'use client';

import * as React from 'react';
import { 
  Menu, LogOut, LayoutDashboard, Database, MessageSquare, 
  Users, Settings as SettingsIcon, Layers, ChevronDown, 
  ChevronsLeft, ChevronsRight, Bell, User, FolderPlus,
  HelpCircle, Command
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/auth';
import { useProjects } from '../../hooks/useProjects';
import { ProtectedRoute } from '../common/ProtectedRoute';
import { SearchBar, CommandPalette } from '../ui/command-palette';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const { projects } = useProjects();
  
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = React.useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [commandCenterOpen, setCommandCenterOpen] = React.useState(false);

  const projectRef = React.useRef<HTMLDivElement>(null);
  const profileRef = React.useRef<HTMLDivElement>(null);
  const notificationsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectRef.current && !projectRef.current.contains(event.target as Node)) {
        setProjectDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Extract active project from URL params
  const projectId = params?.projectId as string | undefined;
  const activeProject = React.useMemo(() => {
    if (!projectId) return null;
    return projects.find((p) => p.id === projectId) || null;
  }, [projects, projectId]);

  // Close mobile menu on navigate
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const selectProject = (id: string | null) => {
    setProjectDropdownOpen(false);
    if (id) {
      router.push(`/projects/${id}`);
    } else {
      router.push('/dashboard');
    }
  };

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  ];

  const projectItems = activeProject
    ? [
        { name: 'Overview', href: `/projects/${activeProject.id}`, icon: Layers },
        { name: 'Knowledge Base', href: `/projects/${activeProject.id}/uploads`, icon: Database },
        { name: 'AI Chat', href: `/projects/${activeProject.id}/chat`, icon: MessageSquare },
        { name: 'Members', href: `/projects/${activeProject.id}/members`, icon: Users },
        { name: 'Settings', href: `/projects/${activeProject.id}/settings`, icon: SettingsIcon },
      ]
    : [];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#030303] text-zinc-100 flex overflow-hidden">
        {/* Desktop Collapsible Sidebar */}
        <motion.aside 
          animate={{ width: sidebarCollapsed ? 76 : 256 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:flex lg:flex-col border-r border-zinc-900/60 bg-[#050505]/80 backdrop-blur-md flex-shrink-0 h-screen sticky top-0 z-40 relative group/sidebar"
        >
          {/* Logo / Title */}
          <div className={cn(
            "h-16 flex items-center border-b border-zinc-900/60 px-6 justify-between overflow-hidden",
            sidebarCollapsed && "px-4 justify-center"
          )}>
            <AnimatePresence mode="wait">
              {!sidebarCollapsed ? (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-2 font-bold tracking-tight text-gradient-emerald text-lg"
                >
                  <span className="h-6 w-6 rounded-lg bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono text-sm shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    M
                  </span>
                  <span>MLCopilot</span>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="h-8 w-8 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono text-sm shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                >
                  M
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Collapse Trigger Button (Visible on Sidebar Hover) */}
            {!sidebarCollapsed && (
              <button 
                onClick={() => setSidebarCollapsed(true)}
                className="opacity-0 group-hover/sidebar:opacity-100 p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/60 transition"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Project Workspace Selector */}
          <div ref={projectRef} className={cn("p-4 border-b border-zinc-900/60 relative", sidebarCollapsed && "p-2.5 flex justify-center")}>
            {sidebarCollapsed ? (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/40 text-zinc-400 hover:text-emerald-400 transition"
                title="Expand Workspace Selector"
              >
                <Layers className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-900/40 border border-zinc-800/40 hover:bg-zinc-900/80 transition text-left relative"
                aria-haspopup="listbox"
                aria-expanded={projectDropdownOpen}
              >
                <div className="truncate">
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Workspace</p>
                  <p className="text-xs font-semibold text-zinc-200 truncate">
                    {activeProject ? activeProject.name : 'Personal Workspace'}
                  </p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
              </button>
            )}

            {/* Dropdown Menu */}
            {projectDropdownOpen && !sidebarCollapsed && (
              <div className="absolute left-4 right-4 mt-2 bg-zinc-950 border border-zinc-900 rounded-xl shadow-2xl z-50 py-1.5 glass-card overflow-hidden max-h-60 overflow-y-auto">
                <button
                  onClick={() => selectProject(null)}
                  className="w-full text-left px-4 py-2 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition font-semibold"
                >
                  Personal Dashboard
                </button>
                <div className="border-t border-zinc-900 my-1" />
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectProject(p.id)}
                    className={cn(
                      "w-full text-left px-4 py-2 text-xs font-semibold transition flex items-center justify-between",
                      activeProject?.id === p.id
                        ? "bg-emerald-950/20 text-emerald-400 border-l-2 border-emerald-500 pl-3.5"
                        : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
                    )}
                  >
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto" aria-label="Main Navigation">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition border border-transparent",
                    isActive
                      ? "bg-emerald-950/20 text-emerald-400 border-emerald-950/50 shadow-[0_0_15px_rgba(16,185,129,0.02)]"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40",
                    sidebarCollapsed && "justify-center px-0.5"
                  )}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-emerald-400" : "text-zinc-500")} />
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}

            {activeProject && (
              <>
                <div className={cn("pt-6 pb-2 px-3", sidebarCollapsed && "px-1 flex justify-center")}>
                  {!sidebarCollapsed ? (
                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Workspace Routes</p>
                  ) : (
                    <div className="h-px bg-zinc-900 w-6" />
                  )}
                </div>
                {projectItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition border border-transparent",
                        isActive
                          ? "bg-emerald-950/20 text-emerald-400 border-emerald-950/50 shadow-[0_0_15px_rgba(16,185,129,0.02)]"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40",
                        sidebarCollapsed && "justify-center px-0.5"
                      )}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-emerald-400" : "text-zinc-500")} />
                      {!sidebarCollapsed && <span>{item.name}</span>}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* Sidebar Footer */}
          <div className={cn("p-4 border-t border-zinc-900/60 bg-zinc-950/10 flex items-center justify-between", sidebarCollapsed && "p-3 flex-col gap-3 justify-center")}>
            {sidebarCollapsed ? (
              <button 
                onClick={() => setSidebarCollapsed(false)}
                className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/60 transition"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2.5 truncate max-w-[160px]">
                <div className="h-7 w-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-300 font-bold font-mono">
                  {user?.full_name?.slice(0, 2).toUpperCase() || 'U'}
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-zinc-200 truncate">{user?.full_name}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
                </div>
              </div>
            )}
            
            <button
              onClick={() => logout()}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-900/60 transition"
              title="Logout Account"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </motion.aside>

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {/* Top Header Navigation */}
          <header className="h-16 border-b border-zinc-900/60 flex items-center justify-between px-6 bg-[#030303]/70 backdrop-blur-md sticky top-0 z-30 shrink-0">
            {/* Left Section: Mobile Menu Trigger + SearchBar */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-lg text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition"
                aria-label="Open navigation drawer"
              >
                <Menu className="h-4.5 w-4.5" />
              </button>

              <div className="hidden md:block">
                <SearchBar onOpenPallet={() => setCommandCenterOpen(true)} />
              </div>
            </div>

            {/* Right Section: Notification Hub, User dropdown */}
            <div className="flex items-center gap-3">
              <div ref={notificationsRef} className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/60 transition relative"
                  aria-label="View notifications"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-zinc-950 animate-pulse" />
                </button>

                {/* Notifications Dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-zinc-950 border border-zinc-900 rounded-xl shadow-2xl z-50 p-4 glass-card">
                    <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-2">
                      <span className="text-xs font-bold text-zinc-300">Notifications</span>
                      <span className="text-[10px] text-emerald-400 font-semibold cursor-pointer">Mark all read</span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      <div className="p-2 rounded bg-zinc-900/40 border border-zinc-800/30 text-[11px] text-zinc-400 leading-normal">
                        Welcome to MLCopilot Platform! Explore your personal workspace and upload document sets to start chatting.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile dropdown */}
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-850 hover:border-zinc-700/60 flex items-center justify-center text-xs text-zinc-300 font-bold transition font-mono"
                >
                  {user?.full_name?.slice(0, 2).toUpperCase() || 'U'}
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-zinc-950 border border-zinc-900 rounded-xl shadow-2xl z-50 py-1.5 glass-card overflow-hidden">
                    <div className="px-4 py-2 border-b border-zinc-900">
                      <p className="text-xs font-bold text-zinc-200 truncate">{user?.full_name}</p>
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setCommandCenterOpen(true);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition font-semibold flex items-center justify-between"
                    >
                      <span>Command Center</span>
                      <span className="text-[9px] bg-zinc-900 border border-zinc-800 rounded px-1 text-zinc-500 font-mono">⌘K</span>
                    </button>
                    <div className="border-t border-zinc-900 my-1" />
                    <button
                      onClick={() => logout()}
                      className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-950/20 transition font-semibold flex items-center justify-between"
                    >
                      <span>Logout account</span>
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Screen Content Render */}
          <main className="flex-1 overflow-y-auto relative">
            {children}
          </main>
        </div>

        {/* Mobile Slide-Over Drawer Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 flex lg:hidden bg-black/80 backdrop-blur-sm">
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="w-72 bg-[#050505] border-r border-zinc-900/60 flex flex-col h-full relative p-5 glass-card" 
                role="dialog" 
                aria-modal="true" 
                aria-label="Mobile Navigation"
              >
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="absolute right-4 top-4 p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-lg"
                  aria-label="Close navigation drawer"
                >
                  &times;
                </button>

                <div className="h-12 flex items-center gap-2 font-bold tracking-tight text-gradient-emerald mb-8">
                  <span className="h-6 w-6 rounded-lg bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono text-xs">
                    M
                  </span>
                  <span className="text-base">MLCopilot</span>
                </div>

                <nav className="flex-1 space-y-1.5" aria-label="Mobile Navigation Drawer">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition border border-transparent",
                          isActive ? "bg-emerald-950/20 text-emerald-400 border-emerald-950/50" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
                        )}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}

                  {activeProject && (
                    <>
                      <div className="pt-6 pb-2 px-3">
                        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Workspace</p>
                      </div>
                      {projectItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition border border-transparent",
                              isActive ? "bg-emerald-950/20 text-emerald-400 border-emerald-950/50" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
                            )}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{item.name}</span>
                          </Link>
                        );
                      })}
                    </>
                  )}
                </nav>

                <div className="border-t border-zinc-900/60 pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate max-w-[180px]">
                    <div className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs text-zinc-300 font-bold font-mono">
                      {user?.full_name?.slice(0, 2).toUpperCase() || 'U'}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-zinc-300 truncate">{user?.full_name}</p>
                    </div>
                  </div>
                  <button onClick={() => logout()} className="p-2 rounded-lg text-zinc-500 hover:text-red-400" aria-label="Logout account">
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
              <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
            </div>
          )}
        </AnimatePresence>

        {/* Global Command Center Portal Overlay */}
        <CommandPalette open={commandCenterOpen} onOpenChange={setCommandCenterOpen} />
      </div>
    </ProtectedRoute>
  );
}
