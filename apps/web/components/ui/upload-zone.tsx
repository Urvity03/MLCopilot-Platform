'use client';

import * as React from 'react';
import { UploadCloud, File, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  isUploading?: boolean;
  accept?: string;
  maxSizeMB?: number;
}

export function UploadZone({
  onFilesSelected,
  isUploading = false,
  accept = '.pdf,.docx,.txt,.md',
  maxSizeMB = 10,
}: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const validateFiles = (files: File[]): File[] => {
    const validFiles: File[] = [];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const acceptedExtensions = accept.split(',').map(ext => ext.trim().toLowerCase());

    for (const file of files) {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedExtensions.includes(extension)) {
        setError(`Only file formats ${accept} are accepted.`);
        continue;
      }
      if (file.size > maxSizeBytes) {
        setError(`Files must be smaller than ${maxSizeMB}MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setError(null);
    }
    return validFiles;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      const validFiles = validateFiles(files);
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files);
      const validFiles = validateFiles(files);
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <motion.div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        animate={{
          borderColor: isDragActive ? '#10b981' : 'rgba(63, 63, 70, 0.4)',
          backgroundColor: isDragActive ? 'rgba(16, 185, 129, 0.03)' : 'rgba(9, 9, 11, 0.2)',
        }}
        transition={{ duration: 0.2 }}
        className={cn(
          "relative flex flex-col items-center justify-center border border-dashed rounded-xl p-10 text-center cursor-pointer transition-shadow select-none overflow-hidden min-h-[220px]",
          isDragActive ? "shadow-[0_0_20px_rgba(16,185,129,0.06)] scale-[1.01]" : "hover:border-zinc-700/80 hover:shadow-[0_0_15px_rgba(255,255,255,0.01)]",
          isUploading && "pointer-events-none opacity-50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isUploading}
        />

        {/* Drag background animation border glow */}
        {isDragActive && (
          <motion.div 
            layoutId="drag-glow"
            className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 pointer-events-none"
          />
        )}

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800/80 text-zinc-500 group-hover:text-zinc-300 mb-4 shadow-[0_4px_10px_rgba(0,0,0,0.3)]">
          <UploadCloud className={cn("h-5 w-5 transition-transform", isDragActive && "scale-110 text-emerald-400")} />
        </div>

        <h3 className="text-xs font-semibold text-zinc-200">
          {isDragActive ? "Drop your documents here" : "Drag & drop files here, or click to choose"}
        </h3>
        <p className="text-[10px] text-zinc-500 mt-1 font-medium">
          Supports PDF, DOCX, Markdown, or plain Text (max. {maxSizeMB}MB)
        </p>

        {isUploading && (
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <span className="text-[10px] font-semibold text-emerald-400 tracking-wider uppercase">Uploading...</span>
          </div>
        )}
      </motion.div>

      {/* Validation Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="mt-3 flex items-center gap-2 rounded-lg border border-red-950/50 bg-red-950/15 px-4 py-2.5 text-[11px] text-red-400"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
