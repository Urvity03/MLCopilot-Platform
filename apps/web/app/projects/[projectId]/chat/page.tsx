'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChat } from '../../../../hooks/useChat';
import { useProjects } from '../../../../hooks/useProjects';
import { useUploads } from '../../../../hooks/useUploads';
import { PageHeader } from '../../../../components/ui/page-header';
import { Card } from '../../../../components/ui/card';
import { Drawer } from '../../../../components/ui/drawer';
import { Button } from '../../../../components/ui/button';
import { toast } from '../../../../components/ui/toast';
import { 
  Send, Bot, User, Trash2, Plus, MessageSquare, 
  Copy, RotateCcw, Quote, Check, Sparkles, Database, X
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const router = useRouter();

  const { projects } = useProjects();
  const { uploads: files } = useUploads(projectId);
  
  // Track active conversation ID
  const [activeConvId, setActiveConvId] = React.useState<string | undefined>(undefined);
  
  const { 
    conversations, 
    isLoadingConversations, 
    activeConversation, 
    isLoadingActiveConversation, 
    sendMessage, 
    isSendingMessage, 
    deleteConversation 
  } = useChat(projectId, activeConvId);

  const [input, setInput] = React.useState('');
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = React.useState<any | null>(null);

  // Keyboard shortcut autocomplete popups states
  const [showMentions, setShowMentions] = React.useState(false);
  const [showCommands, setShowCommands] = React.useState(false);

  const activeProject = React.useMemo(() => {
    return projects.find(p => p.id === projectId) || null;
  }, [projects, projectId]);

  // Set the first conversation as active if none selected
  React.useEffect(() => {
    if (conversations.length > 0 && !activeConvId) {
      setActiveConvId(conversations[0].id);
    }
  }, [conversations, activeConvId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSendingMessage) return;

    const currentMsg = input;
    setInput('');
    setShowMentions(false);
    setShowCommands(false);

    try {
      await sendMessage({
        question: currentMsg,
        conversation_id: activeConvId,
      });
    } catch (err) {
      toast.error('Failed to query the AI assistant. Check knowledge base index.');
      setInput(currentMsg); // restore input
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    const cursor = e.target.selectionStart;
    const beforeCursor = val.slice(0, cursor);

    if (beforeCursor.endsWith('@')) {
      setShowMentions(true);
      setShowCommands(false);
    } else if (beforeCursor.endsWith('/')) {
      setShowCommands(true);
      setShowMentions(false);
    } else {
      if (!beforeCursor.includes('@') && !beforeCursor.includes('/')) {
        setShowMentions(false);
        setShowCommands(false);
      }
    }
  };

  const handleCreateNewConversation = () => {
    setActiveConvId(undefined); // Resetting active id will let the next message spawn a new conversation
    setInput('');
    setShowMentions(false);
    setShowCommands(false);
    toast.success('Ready to start a new chat session.');
  };

  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(msgId);
    toast.success('Message content copied to clipboard.');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegenerate = async (content: string) => {
    if (isSendingMessage) return;
    try {
      await sendMessage({
        question: content,
        conversation_id: activeConvId,
      });
    } catch (err) {
      toast.error('Failed to regenerate answer.');
    }
  };

  const messages = activeConversation?.messages || [];

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden font-sans relative">
      {/* 1. Conversations History Sidebar */}
      <aside className="w-64 border-r border-zinc-900/60 bg-[#050505]/40 backdrop-blur shrink-0 flex flex-col justify-between hidden md:flex select-none">
        <div className="p-4 border-b border-zinc-900/60 shrink-0">
          <Button
            onClick={handleCreateNewConversation}
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 border-zinc-800/80 bg-zinc-950 text-zinc-300 hover:text-white hover:border-indigo-500/20 shadow-sm transition cursor-pointer animate-none"
          >
            <Plus className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs font-semibold">New conversation</span>
          </Button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {isLoadingConversations ? (
            <div className="space-y-2 p-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 rounded bg-zinc-900/40 animate-pulse border border-zinc-950" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-[10px] text-zinc-550 text-center py-6 font-medium">No active sessions found.</p>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeConvId;
              return (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium cursor-pointer transition border border-transparent",
                    isActive
                      ? "bg-indigo-950/20 text-indigo-400 border-indigo-950/30"
                      : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
                  )}
                  onClick={() => setActiveConvId(conv.id)}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-indigo-400" : "text-zinc-500")} />
                    <span className="truncate">{conv.title || 'New Conversation'}</span>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id, {
                        onSuccess: () => {
                          if (activeConvId === conv.id) {
                            setActiveConvId(undefined);
                          }
                          toast.success('Conversation details purged.');
                        }
                      });
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition"
                    title="Purge session"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* 2. Main Chat Workspace */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#030303] relative h-full">
        {/* Active conversation info header */}
        <div className="h-12 border-b border-zinc-900/60 px-6 flex items-center justify-between bg-[#111113]/40 backdrop-blur shrink-0 select-none">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-semibold text-zinc-350">
              {activeProject ? `Copilot: ${activeProject.name}` : 'AI Chat Interface'}
            </span>
          </div>
          <span className="text-[9px] bg-indigo-950/20 border border-indigo-900/30 rounded px-2 py-0.5 text-indigo-400 font-bold font-mono tracking-wider">
            RAG ACTIVE
          </span>
        </div>

        {/* Conversation timeline message feed */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 pb-36">
          {isLoadingActiveConversation && activeConvId ? (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="flex gap-4 p-4 rounded-xl bg-zinc-900/10 border border-zinc-900/40 animate-pulse">
                <div className="h-8 w-8 rounded bg-zinc-800 shrink-0" />
                <div className="space-y-2 flex-1"><div className="h-3 bg-zinc-800 rounded w-1/3" /><div className="h-3 bg-zinc-800 rounded w-5/6" /></div>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-6 select-none">
              <div className="flex flex-col items-center">
                <div className="h-11 w-11 rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-zinc-500 mb-4 shadow-lg shadow-black/20">
                  <Bot className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="text-xs font-semibold text-zinc-200">Start a RAG chat session</h3>
                <p className="text-[10px] text-zinc-500 leading-relaxed font-medium mt-1">
                  Query the custom indexed corpus using semantic similarity search. Answers cite matching context chunks.
                </p>
              </div>

              {/* Sugestion query chips */}
              <div className="space-y-2 w-full pt-4 border-t border-zinc-900/60">
                <p className="text-[9px] font-bold text-zinc-655 uppercase tracking-widest mb-3">AI Suggestions</p>
                {[
                  "Summarize key parameters of the corpus",
                  "What are the main architecture coordinates?",
                  "Inspect data indexing limitations and constraints"
                ].map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(sug)}
                    className="text-left w-full rounded-lg bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/50 hover:border-indigo-500/20 px-3 py-2 text-[10px] font-semibold text-zinc-400 hover:text-indigo-400 transition cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/20"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto">
              {messages.map((msg) => {
                const isAssistant = msg.role === 'assistant';
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      "flex gap-4 p-4.5 rounded-xl border leading-relaxed text-xs",
                      isAssistant
                        ? "bg-[#111113]/40 border-zinc-800/30 shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
                        : "bg-zinc-900/20 border-zinc-850/50"
                    )}
                  >
                    {/* Role Icon */}
                    <div className={cn(
                      "h-8 w-8 rounded-lg border flex items-center justify-center shrink-0 shadow-sm",
                      isAssistant
                        ? "bg-indigo-950/20 border-indigo-500/10 text-indigo-400"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400"
                    )}>
                      {isAssistant ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>

                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex items-center justify-between select-none">
                        <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">
                          {isAssistant ? 'MLCopilot' : 'Developer'}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="p-1 rounded hover:bg-zinc-900 text-zinc-550 hover:text-zinc-350 transition"
                            title="Copy message text"
                          >
                            {copiedId === msg.id ? <Check className="h-3.5 w-3.5 text-emerald-450" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                          {!isAssistant && (
                            <button
                              onClick={() => handleRegenerate(msg.content)}
                              className="p-1 rounded hover:bg-zinc-900 text-zinc-555 hover:text-zinc-350 transition"
                              title="Regenerate prompt answer"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Markdown representation */}
                      <div className="prose prose-invert prose-xs text-zinc-300 leading-relaxed font-sans max-w-none select-text">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>

                      {/* Citations block */}
                      {isAssistant && msg.citations && msg.citations.length > 0 && (
                        <div className="pt-3 border-t border-zinc-900/60 mt-4 space-y-2">
                          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1">
                            <Quote className="h-3 w-3" />
                            <span>Context Citations references</span>
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.citations.map((cite, cIdx) => (
                              <button
                                key={cIdx}
                                onClick={() => setSelectedCitation(cite)}
                                className="inline-flex items-center gap-1 rounded bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 px-2 py-0.5 text-[9px] font-medium text-zinc-400 hover:text-indigo-400 transition cursor-pointer select-none"
                              >
                                <span>[{cIdx + 1}]</span>
                                <span className="truncate max-w-[120px]">{cite.filename}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* Streaming loading typing indicator */}
              {isSendingMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4 p-4.5 rounded-xl border border-zinc-900/20 bg-zinc-950/20 border-zinc-800/30 max-w-3xl"
                >
                  <div className="h-8 w-8 rounded-lg border bg-indigo-950/20 border-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex-1 flex items-center gap-1 py-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce" />
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* 3. Sticky Composer / Floating Context input */}
        <div className="absolute bottom-6 left-6 right-6 z-20">
          <div className="max-w-3xl mx-auto relative bg-[#09090b]/80 backdrop-blur-md border border-zinc-800/60 rounded-xl p-3 shadow-2xl glass-card flex flex-col gap-2">
            
            {/* Popups autocomplete triggers */}
            {showMentions && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-zinc-950 border border-zinc-900 rounded-xl shadow-2xl z-50 p-2 max-h-48 overflow-y-auto glass-card">
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider px-2 py-1 select-none">Scope Query to File Context</p>
                {files.length === 0 ? (
                  <p className="text-[10px] text-zinc-555 p-2 font-medium">No documents uploaded. Type files search queries...</p>
                ) : (
                  files.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => {
                        setInput(prev => prev.replace(/@$/, `@${file.filename} `));
                        setShowMentions(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white transition flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Database className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{file.filename}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {showCommands && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-zinc-950 border border-zinc-900 rounded-xl shadow-2xl z-50 p-2 max-h-48 overflow-y-auto glass-card">
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider px-2 py-1 select-none">Slash Command Shortcuts</p>
                {[
                  { cmd: 'explain', label: 'Explain the architecture of selected context.' },
                  { cmd: 'summarize', label: 'Generate executive summary of active sources.' },
                  { cmd: 'debug', label: 'Audit logs and troubleshoot parser issues.' }
                ].map((action) => (
                  <button
                    key={action.cmd}
                    type="button"
                    onClick={() => {
                      setInput(prev => prev.replace(/\/$/, `/${action.cmd} `));
                      setShowCommands(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white transition flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <span className="text-indigo-400 font-mono font-bold">/{action.cmd}</span>
                    <span className="text-zinc-550">—</span>
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Input Row */}
            <form onSubmit={handleSend} className="relative flex items-center">
              <textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                placeholder="Ask anything about your workspace corpus... (Type @ to search docs, / for commands)"
                rows={1}
                className="w-full bg-transparent border-0 pl-1 pr-12 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 transition resize-none max-h-24 overflow-y-auto leading-relaxed outline-none"
                disabled={isSendingMessage}
              />
              
              <button
                type="submit"
                disabled={!input.trim() || isSendingMessage}
                className={cn(
                  "absolute right-1 p-1.5 rounded-lg border transition cursor-pointer",
                  input.trim() && !isSendingMessage
                    ? "bg-primary border-indigo-500/20 text-white hover:bg-primary/95 shadow-md shadow-indigo-950/20"
                    : "bg-zinc-955 border-zinc-900 text-zinc-650 cursor-not-allowed"
                )}
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
            
            {/* Context helpers */}
            <div className="flex items-center justify-between text-[9px] text-zinc-605 font-mono font-medium select-none px-1">
              <div className="flex gap-3">
                <span>SHIFT + ENTER for newline</span>
                <span>Type @ to search doc context</span>
              </div>
              <span>RAG PIPELINE READY</span>
            </div>
          </div>
        </div>
      </main>

      {/* 4. Side-by-Side Citation Inspector Sidebar Panel (Cursor-grade) */}
      <AnimatePresence>
        {selectedCitation && (
          <motion.aside 
            initial={{ opacity: 0, x: 100, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 320 }}
            exit={{ opacity: 0, x: 100, width: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="border-l border-zinc-900/60 bg-[#070708]/85 backdrop-blur flex flex-col justify-between shrink-0 h-full relative overflow-hidden hidden xl:flex select-none"
          >
            <div className="p-4.5 border-b border-zinc-900/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-250">
                <Quote className="h-3.5 w-3.5 text-indigo-400" />
                <span>Supporting Context Source</span>
              </div>
              <button 
                onClick={() => setSelectedCitation(null)}
                className="p-1 rounded-md text-zinc-550 hover:text-zinc-350 hover:bg-zinc-900/50 transition cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-1">
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wide">Origin Document</span>
                <p className="text-xs font-semibold text-zinc-255 truncate">{selectedCitation.filename}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[10px] text-zinc-550 font-medium">
                <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <span>Score Similarity</span>
                  <p className="text-xs font-bold text-indigo-400 mt-1 font-mono">
                    {(selectedCitation.score * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <span>Position Order</span>
                  <p className="text-xs font-bold text-zinc-300 mt-1 font-mono">
                    Chunk #{selectedCitation.position}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl space-y-2 relative overflow-hidden select-text">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">SUPPORTING TEXT EXCERPT</span>
                <p className="text-zinc-300 text-xs leading-relaxed italic select-text pl-3 border-l-2 border-indigo-500/50">
                  "{selectedCitation.content}"
                </p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Fallback Drawer overlay for mobile / tablet viewports */}
      <div className="xl:hidden">
        <Drawer
          open={!!selectedCitation}
          onClose={() => setSelectedCitation(null)}
          title="Supporting Source Chunk"
          description="Text segment matching query index vectors"
          size="md"
        >
          {selectedCitation && (
            <div className="space-y-4 font-sans leading-relaxed text-xs">
              <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-1.5">
                <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-wide">Origin Document</span>
                <p className="font-semibold text-zinc-200">{selectedCitation.filename}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-1.5">
                  <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-wide">Score Match Similarity</span>
                  <p className="font-bold text-indigo-400 font-mono">
                    {(selectedCitation.score * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-1.5">
                  <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-wide">Position Order</span>
                  <p className="font-semibold text-zinc-350 font-mono">
                    Chunk #{selectedCitation.position}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl space-y-2 relative overflow-hidden">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">SUPPORTING TEXT EXCERPT</span>
                <p className="text-zinc-300 text-xs leading-relaxed italic select-text pl-3 border-l-2 border-indigo-500/50">
                  "{selectedCitation.content}"
                </p>
              </div>
            </div>
          )}
        </Drawer>
      </div>
    </div>
  );
}
