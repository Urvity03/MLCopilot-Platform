'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, LayoutDashboard, Folder, MessageSquare,
  FileText, Users, Settings as SettingsIcon, PlusCircle,
  Upload, Sun, Moon, ArrowRight, CornerDownLeft, Command,
  Compass, Sparkles
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useProjects } from '../../hooks/useProjects';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenNewProject?: () => void;
}

export function CommandPalette({ open, onOpenChange, onOpenNewProject }: CommandPaletteProps) {
  const [mounted, setMounted] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const router = useRouter();
  const params = useParams();
  const { theme, setTheme } = useTheme();
  const { projects } = useProjects();

  const inputRef = React.useRef<HTMLInputElement>(null);

  const activeProjectId = params?.projectId as string | undefined;
  const activeProject = React.useMemo(() => {
    if (!activeProjectId) return projects[0] || null;
    return projects.find((p) => p.id === activeProjectId) || projects[0] || null;
  }, [projects, activeProjectId]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Define Linear / Vercel style items list
  const allItems = React.useMemo(() => {
    const items = [
      // Navigation Category
      {
        id: 'nav-dashboard',
        title: 'Dashboard',
        subtitle: 'View overall activity and project metrics',
        icon: LayoutDashboard,
        category: 'Navigation',
        action: () => router.push('/dashboard'),
      },
      {
        id: 'nav-projects',
        title: 'Projects',
        subtitle: 'Browse all workspaces and project repositories',
        icon: Folder,
        category: 'Navigation',
        action: () => router.push('/dashboard'),
      },
      {
        id: 'nav-documents',
        title: 'Documents',
        subtitle: activeProject ? `View uploaded files for ${activeProject.name}` : 'Browse workspace documents',
        icon: FileText,
        category: 'Navigation',
        action: () => router.push(activeProject ? `/projects/${activeProject.id}/uploads` : '/dashboard'),
      },
      {
        id: 'nav-[#7C5CFC]',
        title: 'AI Chat',
        subtitle: activeProject ? `Open intelligent copilot for ${activeProject.name}` : 'Open AI assistant',
        icon: MessageSquare,
        category: 'Navigation',
        action: () => router.push(activeProject ? `/projects/${activeProject.id}/chat` : '/dashboard'),
      },
      {
        id: 'nav-members',
        title: 'Members',
        subtitle: activeProject ? `Manage team access for ${activeProject.name}` : 'View team members',
        icon: Users,
        category: 'Navigation',
        action: () => router.push(activeProject ? `/projects/${activeProject.id}/members` : '/dashboard'),
      },
      {
        id: 'nav-settings',
        title: 'Settings',
        subtitle: activeProject ? `Configure settings for ${activeProject.name}` : 'Platform configuration',
        icon: SettingsIcon,
        category: 'Navigation',
        action: () => router.push(activeProject ? `/projects/${activeProject.id}/settings` : '/settings'),
      },

      // Actions Category
      {
        id: 'act-new-workspace',
        title: 'New Workspace',
        subtitle: 'Create a new project workspace',
        icon: PlusCircle,
        category: 'Actions',
        action: () => {
          if (onOpenNewProject) {
            onOpenNewProject();
          } else {
            router.push('/dashboard');
          }
        },
      },
      {
        id: 'act-upload-docs',
        title: 'Upload Documents',
        subtitle: 'Ingest PDF, Markdown, or Code into RAG knowledge base',
        icon: Upload,
        category: 'Actions',
        action: () => router.push(activeProject ? `/projects/${activeProject.id}/uploads` : '/dashboard'),
      },
      {
        id: 'act-new-conv',
        title: 'New Conversation',
        subtitle: 'Start a clean AI Chat thread',
        icon: Sparkles,
        category: 'Actions',
        action: () => router.push(activeProject ? `/projects/${activeProject.id}/chat` : '/dashboard'),
      },
      {
        id: 'act-focus-search',
        title: 'Focus Search',
        subtitle: 'Reset search query and focus input',
        icon: Search,
        category: 'Actions',
        action: () => {
          setSearch('');
          inputRef.current?.focus();
        },
      },

      // Preferences Category
      {
        id: 'pref-dark',
        title: 'Dark Mode',
        subtitle: 'Switch application theme to dark sleek mode',
        icon: Moon,
        category: 'Preferences',
        action: () => setTheme('dark'),
      },
      {
        id: 'pref-light',
        title: 'Light Mode',
        subtitle: 'Switch application theme to light crisp mode',
        icon: Sun,
        category: 'Preferences',
        action: () => setTheme('light'),
      },
    ];

    // Append Project Workspaces dynamically
    if (projects.length > 0) {
      projects.forEach((p) => {
        items.push({
          id: `proj-item-${p.id}`,
          title: `Project: ${p.name}`,
          subtitle: `Open project workspace (${p.slug})`,
          icon: Compass,
          category: 'Projects',
          action: () => router.push(`/projects/${p.id}`),
        });
      });
    }

    return items;
  }, [projects, activeProject, router, setTheme, onOpenNewProject]);

  // Instant filtering
  const filteredItems = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return allItems;
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.subtitle.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
    );
  }, [allItems, search]);

  // Handle keyboard shortcuts (Ctrl+K, Esc, Arrows, Enter)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }

      if (!open) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
          onOpenChange(false);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange, filteredItems, selectedIndex]);

  // Reset selected index when filter changes
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Prevent background scroll when modal open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
      setSearch('');
      setSelectedIndex(0);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!mounted) return null;

  // Group filtered items by category for Linear / Vercel style rendering
  const groupedCategories = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof filteredItems>);

  let globalIndexCounter = 0;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Linear / Vercel Style Command Palette Window */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#111217]/95 backdrop-blur-2xl shadow-2xl shadow-black/80 overflow-hidden z-50 flex flex-col max-h-[520px]"
            role="dialog"
            aria-label="Command Palette"
          >
            {/* Command Header Input */}
            <div className="flex items-center gap-3 px-4 border-b border-[rgba(255,255,255,0.06)] h-14 shrink-0 bg-[#0D0D10]/50">
              <Search className="h-4 w-4 text-[var(--primary)] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type a command or search workspace..."
                className="w-full bg-transparent text-sm text-[#F0F0F3] placeholder-[#56585E] border-none outline-none focus:outline-none focus:ring-0"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] bg-[#181A20] border border-[rgba(255,255,255,0.06)] rounded-md px-1.5 py-0.5 text-[#8B8D98] font-mono select-none">
                  ESC
                </span>
              </div>
            </div>

            {/* Results Body */}
            <div className="flex-1 overflow-y-auto p-2 space-y-4">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#56585E] font-medium">
                  No matching commands or pages found for &quot;{search}&quot;.
                </div>
              ) : (
                Object.entries(groupedCategories).map(([category, items]) => (
                  <div key={category} className="space-y-1">
                    <p className="text-[10px] font-semibold text-[#56585E] uppercase tracking-wider px-3 py-1 select-none">
                      {category}
                    </p>
                    {items.map((item) => {
                      const currentIndex = globalIndexCounter++;
                      const isSelected = currentIndex === selectedIndex;
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            item.action();
                            onOpenChange(false);
                          }}
                          onMouseEnter={() => setSelectedIndex(currentIndex)}
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-150 text-xs font-medium cursor-pointer group',
                            isSelected
                              ? 'bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-white shadow-[0_0_15px_rgba(124,92,252,0.12)]'
                              : 'text-[#8B8D98] hover:bg-[#181A20] hover:text-[#F0F0F3] border border-transparent'
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              className={cn(
                                'h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                                isSelected ? 'bg-[var(--primary)] text-white' : 'bg-[#181A20] text-[#56585E] group-hover:text-[#8B8D98]'
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={cn('font-semibold truncate', isSelected ? 'text-white' : 'text-[#F0F0F3]')}>
                                {item.title}
                              </p>
                              <p className="text-[11px] text-[#56585E] truncate mt-0.5">{item.subtitle}</p>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="flex items-center gap-1 text-[10px] text-[var(--primary)] font-mono shrink-0 pl-2">
                              <span>Select</span>
                              <CornerDownLeft className="h-3 w-3" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer Shortcut Bar */}
            <div className="h-10 border-t border-[rgba(255,255,255,0.06)] bg-[#0D0D10]/90 px-4 flex items-center justify-between text-[10px] text-[#56585E] font-medium font-mono shrink-0 select-none">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="bg-[#181A20] border border-[rgba(255,255,255,0.06)] rounded px-1 text-white">↑</span>
                  <span className="bg-[#181A20] border border-[rgba(255,255,255,0.06)] rounded px-1 text-white">↓</span> Navigate
                </span>
                <span className="flex items-center gap-1">
                  <span className="bg-[#181A20] border border-[rgba(255,255,255,0.06)] rounded px-1 text-white">↵</span> Select
                </span>
                <span className="flex items-center gap-1">
                  <span className="bg-[#181A20] border border-[rgba(255,255,255,0.06)] rounded px-1 text-white">ESC</span> Close
                </span>
              </div>
              <div className="flex items-center gap-1 text-[var(--primary)]">
                <Command className="h-3 w-3" />
                <span>Command Palette</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function SearchBar({ onOpenPallet }: { onOpenPallet: () => void }) {
  return (
    <button
      onClick={onOpenPallet}
      className="flex items-center justify-between w-60 px-3 py-1.5 rounded-xl bg-[#111217] hover:bg-[#151720] text-left border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.1)] transition-all group cursor-pointer"
    >
      <div className="flex items-center gap-2 text-[#56585E] group-hover:text-[#8B8D98]">
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">Search...</span>
      </div>
      <span className="text-[10px] bg-[#0D0D10] border border-[rgba(255,255,255,0.06)] rounded-md px-1.5 py-0.5 text-[#56585E] group-hover:text-[#8B8D98] font-mono select-none">
        Ctrl+K
      </span>
    </button>
  );
}
