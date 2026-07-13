'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChat } from '../../../../hooks/useChat';
import { useProjects } from '../../../../hooks/useProjects';
import { PageHeader } from '../../../../components/ui/page-header';
import { Card } from '../../../../components/ui/card';
import { Drawer } from '../../../../components/ui/drawer';
import { Button } from '../../../../components/ui/button';
import { toast } from '../../../../components/ui/toast';
import { 
  Send, Bot, User, Trash2, Plus, MessageSquare, 
  Copy, RotateCcw, Quote, Check, Sparkles 
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

  const handleCreateNewConversation = () => {
    setActiveConvId(undefined); // Resetting active id will let the next message spawn a new conversation
    setInput('');
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

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden font-sans">
      {/* 1. Conversations Sidebar */}
      <aside className="w-64 border-r border-zinc-900/60 bg-[#050505]/45 backdrop-blur flex flex-col shrink-0">
        <div className="p-4 border-b border-zinc-900/60 shrink-0">
          <Button
            onClick={handleCreateNewConversation}
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 border-zinc-800/80 bg-zinc-950 text-zinc-350 hover:text-white hover:border-indigo-500/20 shadow-sm transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs font-semibold">New conversation</span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoadingConversations ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 bg-zinc-900/30 rounded animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-[10px] text-zinc-500 font-medium">
              No chat records found.
            </div>
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
                      deleteConversation(conv.id);
                      if (activeConvId === conv.id) {
                        setActiveConvId(undefined);
                      }
                      toast.success('Conversation record deleted.');
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition shrink-0"
                    title="Delete chat log"
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
      <main className="flex-1 flex flex-col min-w-0 bg-[#030303]">
        {/* Active conversation info */}
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

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoadingActiveConversation && activeConvId ? (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="h-12 bg-zinc-900/20 border border-zinc-800/40 rounded-xl animate-pulse" />
              <div className="h-20 bg-zinc-900/20 border border-zinc-800/40 rounded-xl animate-pulse" />
            </div>
          ) : !activeConversation || activeConversation.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-6">
              <div className="flex flex-col items-center">
                <div className="h-11 w-11 rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-zinc-500 mb-4 shadow-lg shadow-black/20">
                  <Bot className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="text-xs font-semibold text-zinc-200">Start a RAG chat session</h3>
                <p className="text-[10px] text-zinc-500 leading-relaxed font-medium mt-1">
                  Ask questions about your ingested research documents, papers, or code structures. The copilot will cite sources from matching text nodes.
                </p>
              </div>

              {/* Suggestion Chips */}
              <div className="w-full space-y-2 pt-2">
                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest text-center">Suggested Queries</p>
                <div className="flex flex-col gap-2">
                  {[
                    "Summarize the key findings of the documents",
                    "What are the major constraints or limitations mentioned?",
                    "Give me an overview of the methodologies used"
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
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {activeConversation.messages.map((msg) => {
                const isAssistant = msg.role === 'assistant';
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn(
                      "flex gap-4 p-4.5 rounded-xl border border-zinc-900/20 shadow-sm relative group/message",
                      isAssistant 
                        ? "bg-zinc-950/20 border-zinc-800/30" 
                        : "bg-zinc-900/10 border-zinc-900/40"
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

                    {/* Content Block */}
                    <div className="flex-1 space-y-3.5 min-w-0">
                      <div className="text-xs text-zinc-300 leading-relaxed prose prose-invert font-sans prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800">
                        {isAssistant ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>

                      {/* Citation chips */}
                      {isAssistant && msg.citations && msg.citations.length > 0 && (
                        <div className="pt-2 border-t border-zinc-900/40">
                          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <Quote className="h-3 w-3" />
                            <span>Supporting Citations</span>
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.citations.map((cite, cIdx) => (
                              <button
                                key={cIdx}
                                onClick={() => setSelectedCitation(cite)}
                                className="inline-flex items-center gap-1 rounded bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 px-2 py-0.5 text-[9px] font-medium text-zinc-400 hover:text-indigo-455 transition cursor-pointer"
                              >
                                <span>[{cIdx + 1}]</span>
                                <span className="truncate max-w-[120px]">{cite.filename}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Hover copy actions */}
                    <div className="absolute right-4 top-4 flex items-center gap-1 opacity-0 group-hover/message:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-500 hover:text-zinc-200 transition"
                        title="Copy content"
                      >
                        {copiedId === msg.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      </button>
                      
                      {!isAssistant && (
                        <button
                          onClick={() => handleRegenerate(msg.content)}
                          className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-500 hover:text-zinc-200 transition"
                          title="Ask again"
                          disabled={isSendingMessage}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
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

        {/* Input Textarea Bar */}
        <div className="p-4 border-t border-zinc-900/60 bg-zinc-950/20 shrink-0">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto relative flex items-center">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Ask anything about your ingested paper set... (Press Enter to query)"
              rows={1}
              className="w-full rounded-xl bg-zinc-900/50 border border-zinc-800/80 pl-4 pr-12 py-3.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition resize-none max-h-24 overflow-y-auto leading-relaxed subtle-glow outline-none"
              disabled={isSendingMessage}
            />
            
            <button
              type="submit"
              disabled={!input.trim() || isSendingMessage}
              className={cn(
                "absolute right-3.5 p-1.5 rounded-lg border transition cursor-pointer",
                input.trim() && !isSendingMessage
                  ? "bg-primary border-indigo-500/20 text-white hover:bg-primary/95"
                  : "bg-zinc-950 border-zinc-900 text-zinc-650 cursor-not-allowed"
              )}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
          <div className="max-w-3xl mx-auto flex items-center justify-between text-[9px] text-zinc-600 mt-2 font-mono font-medium select-none">
            <span>SHIFT + ENTER for newline</span>
            <span>CITATIONS LOADED ON ANSWER</span>
          </div>
        </div>
      </main>

      {/* Citation Detail Sidebar Drawer */}
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
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Origin Document</span>
              <p className="font-semibold text-zinc-200">{selectedCitation.filename}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-1.5">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Score Match Similarity</span>
                <p className="font-bold text-indigo-400 font-mono">
                  {(selectedCitation.score * 100).toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-1.5">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Position Order</span>
                <p className="font-semibold text-zinc-300 font-mono">
                  Chunk #{selectedCitation.position}
                </p>
              </div>
            </div>

            <div className="p-4 bg-zinc-955 border border-zinc-900 rounded-xl space-y-2 relative overflow-hidden">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">SUPPORTING TEXT EXCERPT</span>
              <p className="text-zinc-300 text-xs leading-relaxed italic select-text pl-3 border-l-2 border-indigo-500/50">
                "{selectedCitation.content}"
              </p>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
