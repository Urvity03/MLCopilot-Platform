'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useProjects } from '../../hooks/useProjects';

export default function GlobalMembersRedirectPage() {
  const router = useRouter();
  const { projects, isLoading } = useProjects();

  const activeProjectId = projects[0]?.id;

  React.useEffect(() => {
    if (!isLoading) {
      if (activeProjectId) {
        router.replace(`/projects/${activeProjectId}/members`);
      } else {
        router.replace('/dashboard');
      }
    }
  }, [isLoading, activeProjectId, router]);

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center font-mono text-xs text-[#8B8D98]">
      <span>Resolving active members workspace...</span>
    </div>
  );
}
