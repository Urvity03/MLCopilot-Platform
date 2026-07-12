'use client';

import { Upload, Plus, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface EventItem {
  id: string;
  type: 'upload' | 'project' | 'chat';
  title: string;
  subtitle: string;
  timestamp: string;
  link: string;
}

interface RecentEventsProps {
  events: EventItem[];
}

export function RecentEvents({ events }: RecentEventsProps) {
  if (events.length === 0) {
    return (
      <div className="flex h-36 flex-col items-center justify-center text-center">
        <p className="text-xs text-zinc-500 font-semibold">No recent workspace events recorded.</p>
      </div>
    );
  }

  const iconMap = {
    upload: Upload,
    project: Plus,
    chat: MessageSquare,
  };

  const colorMap = {
    upload: 'text-emerald-400 bg-emerald-950/20 border-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.02)]',
    project: 'text-cyan-400 bg-cyan-950/20 border-cyan-500/10 shadow-[0_0_10px_rgba(6,182,212,0.02)]',
    chat: 'text-teal-400 bg-teal-950/20 border-teal-500/10 shadow-[0_0_10px_rgba(20,184,166,0.02)]',
  };

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {events.map((item, idx) => {
          const Icon = iconMap[item.type];
          const colorClass = colorMap[item.type];
          const isLast = idx === events.length - 1;

          return (
            <li key={item.id}>
              <div className="relative pb-6" aria-label={`Event: ${item.title}`}>
                {!isLast && (
                  <span
                    className="absolute left-4 top-4 -ml-px h-full w-px bg-zinc-900"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex space-x-3.5 items-center">
                  <div>
                    <span className={`h-8 w-8 rounded-lg flex items-center justify-center border ${colorClass}`}>
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs space-y-0.5">
                      <Link 
                        href={item.link} 
                        className="font-semibold text-zinc-200 hover:text-emerald-400 hover:underline transition-colors"
                      >
                        {item.title}
                      </Link>
                      <p className="text-[10px] text-zinc-500 font-medium">{item.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right whitespace-nowrap text-[9px] text-zinc-500 font-mono font-medium">
                    {new Date(item.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
