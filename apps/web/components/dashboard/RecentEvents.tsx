'use client';

import { Upload, FolderPlus, MessageSquare } from 'lucide-react';
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
      <div className="flex h-32 flex-col items-center justify-center text-center">
        <p className="text-[12px] text-[#56585E]">No recent activity</p>
        <p className="text-[11px] text-[#56585E]/60 mt-1">Events will appear as you use MLCopilot</p>
      </div>
    );
  }

  const iconMap = {
    upload: Upload,
    project: FolderPlus,
    chat: MessageSquare,
  };

  const dotColorMap = {
    upload: 'bg-[#4F8CFF]',
    project: 'bg-[var(--primary)]',
    chat: 'bg-[#3DD68C]',
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-1">
      {events.slice(0, 8).map((item) => {
        const Icon = iconMap[item.type];
        const dotColor = dotColorMap[item.type];

        return (
          <Link
            key={item.id}
            href={item.link}
            className="group flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-[#181A20]"
          >
            {/* Timeline dot */}
            <div className="flex flex-col items-center mt-1.5 flex-shrink-0">
              <div className={`h-2 w-2 rounded-full ${dotColor}`} />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-[#F0F0F3]/80 group-hover:text-[#F0F0F3] transition-colors truncate leading-tight">
                {item.title}
              </p>
              <p className="text-[10px] text-[#56585E] mt-0.5 truncate">
                {item.subtitle}
              </p>
            </div>

            {/* Timestamp */}
            <span className="text-[10px] text-[#56585E] flex-shrink-0 mt-0.5">
              {formatRelativeTime(item.timestamp)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
