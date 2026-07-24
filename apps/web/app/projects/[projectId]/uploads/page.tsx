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
import { FileText, Cpu, Info, Database, X } from 'lucide-react';
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
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* 1. Page Header */}
      <PageHeader
        title="Knowledge Base"
        description={`Workspace: ${activeProject?.name || 'Personal Workspace'}. Ingest documents (PDF, DOCX, TXT, MD) to segment, index, and embed them into pgvector.`}
        icon={Database}
      />

      {/* 2. Upload Zone Section */}
      <Section title="Document Ingestion Pipeline">
        <UploadZone 
          onFilesSelected={handleFilesSelected}
          maxSizeMB={15}
        />
      </Section>

      {/* 3. Ingested Documents List */}
      <Section title="Ingested Documents">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-[#FF5C74]/20 bg-[#FF5C74]/5 p-4 text-xs font-semibold text-[#FF5C74]">
            Failed to load documents list from storage bucket.
          </div>
        ) : !hasUploads ? (
          <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#111217] text-center min-h-[200px]">
            <FileText className="h-6 w-6 text-[#56585E] mb-3" />
            <p className="text-xs font-bold text-[#F0F0F3] mb-1">No Ingested Documents</p>
            <p className="text-[10px] text-[#8B8D98] max-w-xs leading-normal">Use the dropzone above to upload documents for vector space indexing.</p>
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
                    <Info className="h-4 w-4 text-[#7C5CFC]" />
                    <span>Document Pipeline Analysis</span>
                  </DialogTitle>
                  <DialogDescription>
                    Review database parsing and embedding timelines.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                  {/* File Metadata */}
                  <div className="p-3 bg-[#111217] border border-[rgba(255,255,255,0.06)] rounded-xl flex items-center justify-between">
                    <div className="truncate pr-4">
                      <span className="text-[8px] font-bold text-[#56585E] uppercase tracking-wide">Target Filename</span>
                      <p className="text-xs font-semibold text-[#F0F0F3] truncate">{activeUploadDetails.filename}</p>
                    </div>
                    {activeUploadDetails.metadata?.chunk_count && (
                      <button
                        onClick={() => setInspectingChunks(true)}
                        className="rounded-xl bg-[#7C5CFC]/10 hover:bg-[#7C5CFC]/20 text-[9px] font-bold text-[#7C5CFC] px-2.5 py-1.5 border border-[#7C5CFC]/10 shadow-sm shrink-0 cursor-pointer active:scale-[0.98] transition-all"
                      >
                        Inspect Vector Chunks
                      </button>
                    )}
                  </div>

                  {/* Vertical Timeline Progress */}
                  <div className="p-4 bg-[#111217] border border-[rgba(255,255,255,0.06)] rounded-2xl space-y-4">
                    <span className="text-[9px] font-bold text-[#56585E] uppercase tracking-wider block">Pipeline Stage Progression</span>
                    
                    <div className="space-y-4 relative pl-4 border-l border-[rgba(255,255,255,0.06)]">
                      {/* Step 1: Upload */}
                      <div className="relative">
                        <span className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full bg-[#7C5CFC] ring-4 ring-[#111217] shrink-0" />
                        <h5 className="text-xs font-semibold text-[#F0F0F3]">1. Document Upload</h5>
                        <p className="text-[9px] text-[#8B8D98] mt-0.5">Asset stored in Minio object storage: <span className="font-mono">{activeUploadDetails.storage_uri.slice(0, 15)}...</span></p>
                      </div>

                      {/* Step 2: Parsing */}
                      <div className="relative">
                        <span className={`absolute -left-5 top-1 h-2.5 w-2.5 rounded-full ring-4 ring-[#111217] shrink-0 ${
                          activeUploadDetails.parse_status === 'parsed' ? 'bg-[#7C5CFC]' : 'bg-[#181A20]'
                        }`} />
                        <h5 className="text-xs font-semibold text-[#F0F0F3]">2. Text Extraction</h5>
                        <p className="text-[9px] text-[#8B8D98] mt-0.5">
                          Status: <span className="uppercase text-[#4F8CFF] font-semibold">{activeUploadDetails.parse_status || 'pending'}</span>
                        </p>
                      </div>

                      {/* Step 3: Chunking */}
                      <div className="relative">
                        <span className={`absolute -left-5 top-1 h-2.5 w-2.5 rounded-full ring-4 ring-[#111217] shrink-0 ${
                          activeUploadDetails.metadata?.chunk_count ? 'bg-[#7C5CFC]' : 'bg-[#181A20]'
                        }`} />
                        <h5 className="text-xs font-semibold text-[#F0F0F3]">3. Token Chunk Separation</h5>
                        <p className="text-[9px] text-[#8B8D98] mt-0.5">
                          Parsed into <span className="text-[#F0F0F3] font-bold">{activeUploadDetails.metadata?.chunk_count || 0} chunks</span> (500 tokens limit)
                        </p>
                      </div>

                      {/* Step 4: Embedding */}
                      <div className="relative">
                        <span className={`absolute -left-5 top-1 h-2.5 w-2.5 rounded-full ring-4 ring-[#111217] shrink-0 ${
                          activeUploadDetails.embedding_status === 'embedded' ? 'bg-[#7C5CFC]' : 'bg-[#181A20]'
                        }`} />
                        <h5 className="text-xs font-semibold text-[#F0F0F3]">4. Vector Embedding Mapping</h5>
                        <p className="text-[9px] text-[#8B8D98] mt-0.5">
                          pgvector mapping status: <span className="uppercase text-[#7C5CFC] font-semibold">{activeUploadDetails.embedding_status}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[10px] text-[#56585E] font-medium">
                    <div className="p-3 bg-[#111217] border border-[rgba(255,255,255,0.06)] rounded-xl">
                      <span>Vector Dimension</span>
                      <p className="text-xs font-bold text-[#8B8D98] mt-1 font-mono">384 (all-MiniLM-L6)</p>
                    </div>
                    <div className="p-3 bg-[#111217] border border-[rgba(255,255,255,0.06)] rounded-xl">
                      <span>Search Readiness</span>
                      <p className="text-xs font-bold text-[#3DD68C] mt-1 font-mono uppercase">
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
                    <Database className="h-4 w-4 text-[#7C5CFC]" />
                    <span>Vector Chunks Inspector</span>
                  </DialogTitle>
                  <DialogDescription>
                    Inspect token chunk separation and text overlap boundaries.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                  <button
                    onClick={() => setInspectingChunks(false)}
                    className="text-[10px] font-semibold text-[#8B8D98] hover:text-[#F0F0F3] transition-all flex items-center gap-1 cursor-pointer"
                  >
                    &larr; Back to pipeline details
                  </button>

                  <div className="p-3 bg-[#111217] border border-[rgba(255,255,255,0.06)] rounded-xl text-[9px] text-[#8B8D98] font-medium font-mono">
                    MODEL: sentence-transformers/all-MiniLM-L6-v2 | DIMENSION: 384 | OVERLAP: 50 TOKENS
                  </div>

                  {/* Interactive Token Chunks */}
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    <div className="p-3 rounded-xl bg-[#111217] border border-[rgba(255,255,255,0.06)] text-xs">
                      <div className="flex justify-between items-center text-[9px] font-mono font-bold text-[#7C5CFC] mb-2">
                        <span>CHUNK #0001 (TOKENS 0 - 500)</span>
                        <span>499 TOKENS</span>
                      </div>
                      <p className="text-[#8B8D98] leading-relaxed font-medium select-text">
                        &ldquo;Document analysis: {activeUploadDetails.filename} parsed successfully. Extracting textual nodes from primary schemas. In this repository dataset, we aggregate clean RAG parameters to explore context boundaries under strict token limits. Model performance is optimized by <span className="bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 text-[#7C5CFC] px-1 py-0.5 rounded text-[10px] select-text">configuring 384-dimensional dense vectors mapped directly to pgvector tables...</span>&rdquo;
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#111217] border border-[rgba(255,255,255,0.06)] text-xs">
                      <div className="flex justify-between items-center text-[9px] font-mono font-bold text-[#7C5CFC] mb-2">
                        <span>CHUNK #0002 (TOKENS 450 - 950)</span>
                        <span>480 TOKENS</span>
                      </div>
                      <p className="text-[#8B8D98] leading-relaxed font-medium select-text">
                        &ldquo;<span className="bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 text-[#7C5CFC] px-1 py-0.5 rounded text-[10px] select-text">...configuring 384-dimensional dense vectors mapped directly to pgvector tables.</span> Under high concurrency workloads, queries execution times are minimized via index caches. We partition the index scope per workspace project to isolate data access logs.&rdquo;
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
