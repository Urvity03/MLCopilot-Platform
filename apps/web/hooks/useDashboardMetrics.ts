import { useQuery } from '@tanstack/react-query';
import { projectsService } from '../services/projects';
import { uploadsService } from '../services/uploads';
import { chatService } from '../services/chat';
import { Project, Upload, Conversation } from '../types';

export interface DashboardMetrics {
  totalProjects: number;
  totalDocuments: number;
  totalChunks: number;
  totalEmbeddings: number;
  totalConversations: number;
  projectsList: Array<Project & { documentCount: number; conversationCount: number }>;
  recentActivity: Array<{
    id: string;
    type: 'upload' | 'project' | 'chat';
    title: string;
    subtitle: string;
    timestamp: string;
    link: string;
  }>;
  storageStats: {
    documentsCount: number;
    chunksCount: number;
    embeddingsCount: number;
  };
}

/**
 * ARCHITECTURAL TRADEOFF & LIMITATION NOTE:
 * Currently, there is no dedicated backend endpoint for global dashboard metrics.
 * The frontend aggregates metrics through an N+1 query strategy:
 * 1. Fetch the projects list.
 * 2. In parallel, dispatch 2 queries (uploads, conversations) per project.
 * 
 * TODO: Replace this client-side aggregation with a dedicated backend summary
 * endpoint (e.g. GET /dashboard/metrics) in a future sprint to reduce network
 * overhead and scale with a large number of projects.
 */
export function useDashboardMetrics() {
  return useQuery<DashboardMetrics>({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      // 1. Fetch projects
      const projects = await projectsService.list();

      // 2. Fetch uploads and conversations in parallel with error isolation per project
      const projectsData = await Promise.all(
        projects.map(async (project) => {
          let uploads: Upload[] = [];
          let conversations: Conversation[] = [];
          
          // Isolate project-level failures so one broken project does not block the entire dashboard
          try {
            uploads = await uploadsService.list(project.id);
          } catch (e) {
            console.error(`Error loading uploads for project ${project.id}:`, e);
          }

          try {
            conversations = await chatService.listConversations(project.id);
          } catch (e) {
            console.error(`Error loading conversations for project ${project.id}:`, e);
          }

          return {
            project,
            uploads,
            conversations,
          };
        })
      );

      // 3. Aggregate metrics
      const totalProjects = projects.length;
      let totalDocuments = 0;
      let totalChunks = 0;
      let totalEmbeddings = 0;
      let totalConversations = 0;
      
      const projectsList: DashboardMetrics['projectsList'] = [];
      const activities: DashboardMetrics['recentActivity'] = [];

      projectsData.forEach(({ project, uploads, conversations }) => {
        totalDocuments += uploads.length;
        totalConversations += conversations.length;

        let projectChunks = 0;
        let projectEmbeddings = 0;

        uploads.forEach((upload) => {
          const chunkCount = upload.metadata?.chunk_count || 0;
          projectChunks += chunkCount;
          totalChunks += chunkCount;

          if (upload.embedding_status === 'embedded') {
            projectEmbeddings += chunkCount;
            totalEmbeddings += chunkCount;
          }

          activities.push({
            id: upload.id,
            type: 'upload',
            title: `Document uploaded: ${upload.filename}`,
            subtitle: `Project: ${project.name} | Status: ${upload.embedding_status}`,
            timestamp: upload.created_at,
            link: `/projects/${project.id}/uploads`,
          });
        });

        conversations.forEach((conv) => {
          activities.push({
            id: conv.id,
            type: 'chat',
            title: `Chat session: ${conv.title || 'New Conversation'}`,
            subtitle: `Project: ${project.name}`,
            timestamp: conv.created_at,
            link: `/projects/${project.id}/chat`,
          });
        });

        activities.push({
          id: project.id,
          type: 'project',
          title: `Project workspace created: ${project.name}`,
          subtitle: project.description || 'No description provided.',
          timestamp: project.created_at,
          link: `/projects/${project.id}`,
        });

        projectsList.push({
          ...project,
          documentCount: uploads.length,
          conversationCount: conversations.length,
        });
      });

      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

      return {
        totalProjects,
        totalDocuments,
        totalChunks,
        totalEmbeddings,
        totalConversations,
        projectsList,
        recentActivity: sortedActivities,
        storageStats: {
          documentsCount: totalDocuments,
          chunksCount: totalChunks,
          embeddingsCount: totalEmbeddings,
        },
      };
    },
    staleTime: 30 * 1000,          // Keep metrics fresh for 30 seconds
    gcTime: 5 * 60 * 1000,         // Keep cache entries for 5 minutes
    retry: false,                  // Fail quickly to render isolated error states
  });
}
