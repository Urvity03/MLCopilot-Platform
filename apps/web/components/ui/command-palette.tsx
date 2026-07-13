'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Folder, MessageSquare, Database, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useProjects } from '../../hooks/useProjects';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [mounted, setMounted] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  
  const router = useRouter();
  const { projects } = useProjects();

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Filter actions and projects
  const filteredItems = React.useMemo(() => {
    const defaultActions = [
      { id: 'dashboard', title: 'Go to Dashboard', icon: Folder, category: 'Navigation', href: '/dashboard' },
    ];

    const projectItems = projects.map(p => ({
      id: `proj-${p.id}`,
      title: `Workspace: ${p.name}`,
      icon: Folder,
      category: 'Workspaces',
      href: `/projects/${p.id}`,
    }));

    const chatItems = projects.map(p => ({
      id: `chat-${p.id}`,
      title: `Chat: ${p.name}`,
      icon: MessageSquare,
      category: 'AI Chat',
      href: `/projects/${p.id}/chat`,
    }));

    const uploadItems = projects.map(p => ({
      id: `upload-${p.id}`,
      title: `Upload docs: ${p.name}`,
      icon: Database,
      category: 'Knowledge Base',
      href: `/projects/${p.id}/uploads`,
    }));

    const all = [...defaultActions, ...projectItems, ...chatItems, ...uploadItems];
    
    if (!search.trim()) return all.slice(0, 8); // show top 8
    
    return all.filter(item => 
      item.title.toLowerCase().includes(search.toLowerCase()) || 
      item.category.toLowerCase().includes(search.toLowerCase())
    );
  }, [projects, search]);

  // Handle shortcut Ctrl+K / Cmd+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
      
      if (!open) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          router.push(filteredItems[selectedIndex].href);
          onOpenChange(false);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange, filteredItems, selectedIndex, router]);

  // Reset selected index when search changes
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Lock body scroll
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-[6px]"
          />

          {/* Dialog Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950/80 shadow-2xl glass-card overflow-hidden z-50 flex flex-col max-h-[450px]"
          >
            {/* Input Header */}
            <div className="flex items-center gap-3 px-4 border-b border-zinc-900/60 h-12 shrink-0">
              <Search className="h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search workspaces, chat channels, document uploads..."
                className="w-full bg-transparent text-sm text-zinc-200 placeholder-zinc-500 border-none outline-none focus:ring-0 focus:border-none focus:outline-none"
                autoFocus
              />
              <span className="text-[10px] bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-500 font-mono select-none">
                ESC
              </span>
            </div>

            {/* Results Body */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 font-medium">
                  No matching workspace actions found.
                </div>
              ) : (
                filteredItems.map((item, index) => {
                  const Icon = item.icon;
                  const isSelected = index === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        router.push(item.href);
                        onOpenChange(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition text-xs font-medium cursor-pointer",
                        isSelected
                          ? "bg-indigo-950/20 text-indigo-400 border border-indigo-900/30"
                          : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200 border border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={cn("h-4 w-4", isSelected ? "text-indigo-400" : "text-zinc-500")} />
                        <div>
                          <p className={cn("font-medium", isSelected ? "text-zinc-200" : "text-zinc-300")}>
                            {item.title}
                          </p>
                          <p className="text-[9px] text-zinc-500 font-mono tracking-wider uppercase mt-0.5">
                            {item.category}
                          </p>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <span className="flex items-center gap-1 text-[10px] text-indigo-400 font-mono">
                          <span>Enter</span>
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Shortcut hints footer */}
            <div className="h-8 border-t border-zinc-900/60 bg-zinc-950/40 px-4 flex items-center justify-between text-[9px] text-zinc-500 font-medium font-mono shrink-0 select-none">
              <div className="flex gap-4">
                <span>↑↓ Navigate</span>
                <span>↵ Open selection</span>
              </div>
              <div>
                <span>MLCopilot Command Center</span>
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
      className="flex items-center justify-between w-60 px-3 py-1.5 rounded-lg bg-zinc-900/50 hover:bg-zinc-900 text-left border border-zinc-800/60 hover:border-zinc-700/60 transition group"
    >
      <div className="flex items-center gap-2 text-zinc-500 group-hover:text-zinc-400">
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">Search workspaces...</span>
      </div>
      <span className="text-[9px] bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-500 group-hover:text-zinc-400 font-mono select-none">
        ⌘K
      </span>
    </button>
  );
}
