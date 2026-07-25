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

  // Reset search on close
  React.useEffect(() => {
    if (!open) {
      setSearch('');
      setSelectedIndex(0);
    }
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
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Dialog Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#141418]/95 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden z-50 flex flex-col max-h-[460px]"
          >
            {/* Input Header */}
            <div className="flex items-center gap-3 px-4 border-b border-[rgba(255,255,255,0.04)] h-12 shrink-0">
              <Search className="h-4 w-4 text-[#56585E]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search workspaces, chat channels, documents..."
                className="w-full bg-transparent text-sm text-[#F0F0F3] placeholder-[#56585E] border-none outline-none focus:ring-0 focus:border-none focus:outline-none"
                autoFocus
              />
              <span className="text-[10px] bg-[#0D0D10] border border-[rgba(255,255,255,0.06)] rounded-md px-1.5 py-0.5 text-[#56585E] font-mono select-none">
                ESC
              </span>
            </div>

            {/* Results Body */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {filteredItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#56585E] font-medium">
                  No matching actions found.
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
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-150 text-xs font-medium cursor-pointer',
                        isSelected
                          ? 'bg-[#7C5CFC]/10 text-[#B4A0FF]'
                          : 'text-[#8B8D98] hover:bg-[#1C1D24] hover:text-[#F0F0F3]'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={cn('h-4 w-4', isSelected ? 'text-[#7C5CFC]' : 'text-[#56585E]')} />
                        <div>
                          <p className={cn('font-medium', isSelected ? 'text-[#F0F0F3]' : 'text-[#8B8D98]')}>
                            {item.title}
                          </p>
                          <p className="text-[9px] text-[#56585E] font-mono tracking-wider uppercase mt-0.5">
                            {item.category}
                          </p>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <span className="flex items-center gap-1 text-[10px] text-[#7C5CFC] font-mono">
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
            <div className="h-9 border-t border-[rgba(255,255,255,0.04)] bg-[#0D0D10]/60 px-4 flex items-center justify-between text-[10px] text-[#56585E] font-medium font-mono shrink-0 select-none">
              <div className="flex gap-4">
                <span>↑↓ Navigate</span>
                <span>↵ Open</span>
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
      className="flex items-center justify-between w-60 px-3 py-1.5 rounded-xl bg-[#111217] hover:bg-[#151720] text-left border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.1)] transition-all group"
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
