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
import { FileText, Cpu, Activity, Info, Database } from 'lucide-react';
import { SkeletonCard } from '../../../../components/ui/skeletons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../../components/ui/dialog';

export default function UploadsPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  
  const { projects } = useProjects();
  const { uploads, isLoading, isError, uploadFile } = useUploads(projectId);
  
  const [activeUploadDetails, setActiveUploadDetails] = React.useState<any | null>(null);
  const [inspectingChunks, setInspectingChunks] = React.useState<boolean>(false);
 
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

  const handleCloseDetails = () => {
    setActiveUploadDetails(null);
    setInspectingChunks(false);
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

      {/* Metadata Detail & Timeline Dialog Overlay */}
      <Dialog open={!!activeUploadDetails} onOpenChange={(open) => !open && handleCloseDetails()}>
        <DialogContent className="max-w-md font-sans">
          {!inspectingChunks ? (
            activeUploadDetails && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-sm font-bold">
                    <Info className="h-4 w-4 text-indigo-400" />
                    <span>Document Pipeline Analysis</span>
                  </DialogTitle>
                  <DialogDescription>
                    Review database parsing and embedding timelines.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                  {/* File Metadata */}
                  <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg flex items-center justify-between">
                    <div className="truncate pr-4">
                      <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wide">Target Filename</span>
                      <p className="text-xs font-semibold text-zinc-200 truncate">{activeUploadDetails.filename}</p>
                    </div>
                    {activeUploadDetails.metadata?.chunk_count && (
                      <button
                        onClick={() => setInspectingChunks(true)}
                        className="rounded-lg bg-indigo-950/40 hover:bg-indigo-900/30 text-[9px] font-bold text-indigo-400 px-2.5 py-1.5 border border-indigo-900/20 shadow-sm shrink-0 cursor-pointer active:translate-y-px"
                      >
                        Inspect Vector Chunks
                      </button>
                    )}
                  </div>

                  {/* Vertical Timeline Progress */}
                  <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl space-y-4">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Pipeline Stage Progression</span>
                    
                    <div className="space-y-4 relative pl-4 border-l border-zinc-900">
                      {/* Step 1: Upload */}
                      <div className="relative">
                        <span className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-zinc-950 shrink-0" />
                        <h5 className="text-xs font-semibold text-zinc-200">1. Document Upload</h5>
                        <p className="text-[9px] text-zinc-500 mt-0.5">Asset stored in Minio object storage: <span className="font-mono">{activeUploadDetails.storage_uri.slice(0, 15)}...</span></p>
                      </div>

                      {/* Step 2: Parsing */}
                      <div className="relative">
                        <span className={`absolute -left-5 top-1 h-2.5 w-2.5 rounded-full ring-4 ring-zinc-950 shrink-0 ${
                          activeUploadDetails.parse_status === 'parsed' ? 'bg-indigo-500' : 'bg-zinc-850'
                        }`} />
                        <h5 className="text-xs font-semibold text-zinc-200">2. Text Extraction</h5>
                        <p className="text-[9px] text-zinc-500 mt-0.5">
                          Status: <span className="uppercase text-cyan-400 font-semibold">{activeUploadDetails.parse_status || 'pending'}</span>
                        </p>
                      </div>

                      {/* Step 3: Chunking */}
                      <div className="relative">
                        <span className={`absolute -left-5 top-1 h-2.5 w-2.5 rounded-full ring-4 ring-zinc-950 shrink-0 ${
                          activeUploadDetails.metadata?.chunk_count ? 'bg-indigo-500' : 'bg-zinc-850'
                        }`} />
                        <h5 className="text-xs font-semibold text-zinc-200">3. Token Chunk Separation</h5>
                        <p className="text-[9px] text-zinc-500 mt-0.5">
                          Parsed into <span className="text-white font-bold">{activeUploadDetails.metadata?.chunk_count || 0} chunks</span> (500 tokens limit)
                        </p>
                      </div>

                      {/* Step 4: Embedding */}
                      <div className="relative">
                        <span className={`absolute -left-5 top-1 h-2.5 w-2.5 rounded-full ring-4 ring-zinc-950 shrink-0 ${
                          activeUploadDetails.embedding_status === 'embedded' ? 'bg-indigo-500' : 'bg-zinc-850'
                        }`} />
                        <h5 className="text-xs font-semibold text-zinc-200">4. Vector Embedding Mapping</h5>
                        <p className="text-[9px] text-zinc-500 mt-0.5">
                          pgvector mapping status: <span className="uppercase text-indigo-400 font-semibold">{activeUploadDetails.embedding_status}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[10px] text-zinc-500 font-medium">
                    <div className="p-3 bg-zinc-900/30 border border-zinc-800/60 rounded-lg">
                      <span>Vector Dimension</span>
                      <p className="text-xs font-bold text-zinc-300 mt-1 font-mono">384 (all-MiniLM-L6)</p>
                    </div>
                    <div className="p-3 bg-zinc-900/30 border border-zinc-800/60 rounded-lg">
                      <span>Search Readiness</span>
                      <p className="text-xs font-bold text-emerald-450 mt-1 font-mono uppercase">
                        {activeUploadDetails.embedding_status === 'embedded' ? 'ACTIVE' : 'LOCKED'}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )
          ) : (
            activeUploadDetails && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-sm font-bold">
                    <Database className="h-4 w-4 text-indigo-400" />
                    <span>Vector Chunks Inspector</span>
                  </DialogTitle>
                  <DialogDescription>
                    Inspect token chunk separation and text overlap boundaries.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                  <button
                    onClick={() => setInspectingChunks(false)}
                    className="text-[10px] font-semibold text-zinc-550 hover:text-zinc-300 transition flex items-center gap-1 cursor-pointer"
                  >
                    ← Back to pipeline details
                  </button>

                  <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg text-[9px] text-zinc-500 font-medium font-mono">
                    MODEL: sentence-transformers/all-MiniLM-L6-v2 | DIMENSION: 384 | OVERLAP: 50 TOKENS
                  </div>

                  {/* Interactive Token Chunks */}
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-850 text-xs">
                      <div className="flex justify-between items-center text-[9px] font-mono font-bold text-indigo-400 mb-2">
                        <span>CHUNK #0001 (TOKENS 0 - 500)</span>
                        <span>499 TOKENS</span>
                      </div>
                      <p className="text-zinc-300 leading-relaxed font-medium select-text">
                        "Document analysis: {activeUploadDetails.filename} parsed successfully. Extracting textual nodes from primary schemas. In this repository dataset, we aggregate clean RAG parameters to explore context boundaries under strict token limits. Model performance is optimized by <span className="bg-indigo-950 border border-indigo-900 text-indigo-400 px-1 py-0.5 rounded text-[10px] select-text">configuring 384-dimensional dense vectors mapped directly to pgvector tables...</span>"
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-850 text-xs">
                      <div className="flex justify-between items-center text-[9px] font-mono font-bold text-indigo-400 mb-2">
                        <span>CHUNK #0002 (TOKENS 450 - 950)</span>
                        <span>480 TOKENS</span>
                      </div>
                      <p className="text-zinc-300 leading-relaxed font-medium select-text">
                        "<span className="bg-indigo-950 border border-indigo-900 text-indigo-400 px-1 py-0.5 rounded text-[10px] select-text">...configuring 384-dimensional dense vectors mapped directly to pgvector tables.</span> Under high concurrency workloads, queries execution times are minimized via index caches. We partition the index scope per workspace project to isolate data access logs."
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )
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
