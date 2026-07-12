'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '../../../../components/ui/page-header';
import { Section } from '../../../../components/ui/section';
import { UploadZone } from '../../../../components/ui/upload-zone';
import { FileCard } from '../../../../components/ui/file-card';
import { useUploads } from '../../../../hooks/useUploads';
import { useProjects } from '../../../../hooks/useProjects';
import { toast } from '../../../../components/ui/toast';
import { FileText, Cpu, Activity, Info } from 'lucide-react';
import { SkeletonCard } from '../../../../components/ui/skeletons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../../components/ui/dialog';

export default function UploadsPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  
  const { projects } = useProjects();
  const { uploads, isLoading, isError, uploadFile } = useUploads(projectId);
  
  const [activeUploadDetails, setActiveUploadDetails] = React.useState<any | null>(null);

  const activeProject = React.useMemo(() => {
    return projects.find(p => p.id === projectId) || null;
  }, [projects, projectId]);

  const handleFilesSelected = async (files: File[]) => {
    toast.promise(
      Promise.all(
        files.map(async (file) => {
          try {
            await uploadFile({ file });
          } catch (err) {
            console.error(`Failed uploading ${file.name}:`, err);
            throw err;
          }
        })
      ),
      {
        loading: `Uploading ${files.length} document${files.length > 1 ? 's' : ''}...`,
        success: 'Files uploaded successfully! Emitting parser pipelines.',
        error: 'Failed to upload some documents. Check file extensions or size.',
      }
    );
  };

  const hasUploads = uploads.length > 0;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* 1. Page Header */}
      <WorkspaceHeaderWrapper activeProjectName={activeProject?.name} />

      {/* 2. Upload Zone Section */}
      <Section title="Document Ingestion Core">
        <UploadZone 
          onFilesSelected={handleFilesSelected}
          maxSizeMB={15}
        />
      </Section>

      {/* 3. Ingested Documents List */}
      <Section title="Ingested Documents Repository">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-red-900/20 bg-red-950/10 p-4 text-xs font-semibold text-red-400">
            Failed to load documents list from storage bucket.
          </div>
        ) : !hasUploads ? (
          <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-zinc-800/40 bg-zinc-900/10 text-center text-zinc-500 min-h-[200px]">
            <FileText className="h-6 w-6 text-zinc-600 mb-2.5" />
            <p className="text-xs font-bold text-zinc-400 mb-0.5">No Ingested Documents Found</p>
            <p className="text-[10px] text-zinc-500 max-w-xs font-medium">Use the drag zone above to upload corpus materials for RAG indexing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {uploads.map((upload) => (
              <FileCard
                key={upload.id}
                upload={upload}
                onViewDetails={(u) => setActiveUploadDetails(u)}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Metadata Detail Dialog Overlay */}
      <Dialog open={!!activeUploadDetails} onOpenChange={(open) => !open && setActiveUploadDetails(null)}>
        <DialogContent className="max-w-md font-sans">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <Info className="h-4 w-4 text-emerald-400" />
              <span>Document Metadata Analysis</span>
            </DialogTitle>
            <DialogDescription>
              Detailed system record metrics for the uploaded object.
            </DialogDescription>
          </DialogHeader>

          {activeUploadDetails && (
            <div className="space-y-4">
              <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-1">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Filename</span>
                <p className="text-xs font-semibold text-zinc-200 truncate">{activeUploadDetails.filename}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-1">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Ingestion Status</span>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-emerald-400 font-semibold uppercase">
                    <Activity className="h-3.5 w-3.5" />
                    <span>{activeUploadDetails.embedding_status}</span>
                  </div>
                </div>
                <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-1">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Parser Pipeline</span>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-cyan-400 font-semibold uppercase">
                    <Cpu className="h-3.5 w-3.5" />
                    <span>{activeUploadDetails.parse_status}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-1.5">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Minio Storage Key URI</span>
                <p className="text-[10px] font-mono text-zinc-400 leading-relaxed break-all select-all p-1 bg-zinc-950 border border-zinc-900 rounded">
                  {activeUploadDetails.storage_uri}
                </p>
              </div>

              {activeUploadDetails.metadata && Object.keys(activeUploadDetails.metadata).length > 0 && (
                <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-1.5">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">System Metadata Attributes</span>
                  <pre className="text-[10px] font-mono text-zinc-400 leading-normal p-2 bg-zinc-950 border border-zinc-900 rounded max-h-40 overflow-y-auto">
                    {JSON.stringify(activeUploadDetails.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkspaceHeaderWrapper({ activeProjectName }: { activeProjectName?: string }) {
  return (
    <PageHeader
      title="Knowledge Base Repository"
      description={`Workspace: ${activeProjectName || 'Personal Workspace'}. Upload documents (PDF, Markdown, DOCX, TXT) to split them into parsed chunks and embed them into pgvector.`}
    />
  );
}
