'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChat } from '../../../../hooks/useChat';
import { useProjects } from '../../../../hooks/useProjects';
import { useUploads } from '../../../../hooks/useUploads';
import { Card } from '../../../../components/ui/card';
import { Drawer } from '../../../../components/ui/drawer';
import { Button } from '../../../../components/ui/button';
import { toast } from '../../../../components/ui/toast';
import { 
  Send, Bot, User, Trash2, Plus, MessageSquare, 
  Copy, RotateCcw, Quote, Check, Sparkles, Database, X, ChevronDown, Terminal, Sliders, HelpCircle
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
    sendMessageStream,
    isSendingMessage, 
    deleteConversation 
  } = useChat(projectId, activeConvId);

  const [input, setInput] = React.useState('');
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = React.useState<any | null>(null);
  const [activeModel, setActiveModel] = React.useState('gpt-4o');

  // Streaming UI state
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [streamingUserMsg, setStreamingUserMsg] = React.useState<string | null>(null);
  const [streamingContent, setStreamingContent] = React.useState('');
  const [streamingCitations, setStreamingCitations] = React.useState<any[]>([]);

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
    if (!input.trim() || isSendingMessage || isStreaming) return;

    const currentMsg = input;
    setInput('');
    setShowMentions(false);
    setShowCommands(false);

    setIsStreaming(true);
    setStreamingUserMsg(currentMsg);
    setStreamingContent('');
    setStreamingCitations([]);

    try {
      console.log('[CHAT UI] Sending query stream:', { question: currentMsg, activeConvId });
      await sendMessageStream(
        {
          question: currentMsg,
          conversation_id: activeConvId,
        },
        {
          onMetadata: (data) => {
            console.log('[CHAT UI] Metadata event received:', data);
            if (data.conversation_id) {
              setActiveConvId(data.conversation_id);
            }
            if (data.citations) {
              setStreamingCitations(data.citations);
            }
          },
          onToken: (token) => {
            setStreamingContent((prev) => prev + token);
          },
          onDone: () => {
            console.log('[CHAT UI] Stream complete event received');
            setIsStreaming(false);
            setStreamingUserMsg(null);
            setStreamingContent('');
            setStreamingCitations([]);
          },
          onError: (err) => {
            console.error('[CHAT UI] Stream error:', err);
            toast.error(err.message || 'Failed to query the AI assistant. Check knowledge base index.');
            setInput(currentMsg);
            setIsStreaming(false);
            setStreamingUserMsg(null);
            setStreamingContent('');
            setStreamingCitations([]);
          },
        }
      );
    } catch (err: any) {
      console.error('[CHAT UI] Send error:', err);
      toast.error(err.message || 'Failed to query the AI assistant. Check knowledge base index.');
      setInput(currentMsg);
      setIsStreaming(false);
      setStreamingUserMsg(null);
      setStreamingContent('');
      setStreamingCitations([]);
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
    <div className="flex h-[calc(100vh-56px)] overflow-hidden font-sans relative bg-[#09090B] animate-fade-in">
      {/* 1. Conversations History Sidebar */}
      <aside className="w-60 border-r border-[rgba(255,255,255,0.06)] bg-[#0D0D10] shrink-0 flex flex-col justify-between hidden md:flex select-none">
        <div className="p-3 border-b border-[rgba(255,255,255,0.04)] shrink-0">
          <Button
            onClick={handleCreateNewConversation}
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 border-[rgba(255,255,255,0.06)] bg-[#111217] text-[#8B8D98] hover:text-[#F0F0F3] hover:border-[#7C5CFC]/20 transition-all active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5 text-[#7C5CFC]" />
            <span className="text-xs font-medium">New conversation</span>
          </Button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoadingConversations ? (
            <div className="space-y-2 p-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 rounded-lg bg-[#111217] animate-pulse border border-[rgba(255,255,255,0.04)]" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-[10px] text-[#56585E] text-center py-6 font-medium">No active sessions found.</p>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeConvId;
              return (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium cursor-pointer transition-all border border-transparent",
                    isActive
                      ? "bg-[#7C5CFC]/10 text-[#F0F0F3] border-[#7C5CFC]/10"
                      : "text-[#8B8D98] hover:bg-[#181A20] hover:text-[#F0F0F3]"
                  )}
                  onClick={() => setActiveConvId(conv.id)}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-[#7C5CFC]" : "text-[#56585E]")} />
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
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[#56585E] hover:text-[#FF5C74] hover:bg-[#111217] transition-all"
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
      <main className="flex-1 flex flex-col min-w-0 bg-[#09090B] relative h-full">
        {/* Active conversation info header */}
        <div className="h-12 border-b border-[rgba(255,255,255,0.06)] px-6 flex items-center justify-between bg-[#111217]/40 backdrop-blur-xl shrink-0 select-none">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#7C5CFC]" />
            <span className="text-xs font-semibold text-[#8B8D98]">
              {activeProject ? `Copilot: ${activeProject.name}` : 'AI Chat Interface'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* LLM Model Selector Dropdown Mock */}
            <div className="flex items-center gap-1.5 rounded-lg bg-[#111217] border border-[rgba(255,255,255,0.06)] px-2.5 py-1 text-[11px] font-medium text-[#8B8D98]">
              <Terminal className="h-3 w-3 text-[#7C5CFC]" />
              <span>gpt-4o</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </div>
            <span className="text-[9px] bg-[#7C5CFC]/10 border border-[#7C5CFC]/10 rounded-md px-2 py-0.5 text-[#7C5CFC] font-bold font-mono tracking-wider">
              RAG PIPELINE
            </span>
          </div>
        </div>

        {/* Conversation timeline message feed */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 pb-36">
          {isLoadingActiveConversation && activeConvId ? (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="flex gap-4 p-4.5 rounded-2xl bg-[#111217] border border-[rgba(255,255,255,0.06)] animate-pulse">
                <div className="h-8 w-8 rounded-lg bg-[#181A20] shrink-0" />
                <div className="space-y-2 flex-1"><div className="h-3 bg-[#181A20] rounded w-1/3" /><div className="h-3 bg-[#181A20] rounded w-5/6" /></div>
              </div>
            </div>
          ) : (messages.length === 0 && !isStreaming) ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6 select-none animate-fade-in-up">
              <div className="flex flex-col items-center">
                <div className="h-12 w-12 rounded-2xl bg-[#7C5CFC]/10 border border-[#7C5CFC]/15 flex items-center justify-center text-[#7C5CFC] mb-4 shadow-lg shadow-[#7C5CFC]/5">
                  <Bot className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold text-[#F0F0F3]">Ask MLCopilot anything</h3>
                <p className="text-xs text-[#8B8D98] leading-relaxed mt-1">
                  Query the custom indexed corpus using semantic similarity search. Answers cite matching context chunks.
                </p>
              </div>

              {/* Suggestions chips */}
              <div className="space-y-2 w-full pt-4 border-t border-[rgba(255,255,255,0.06)]">
                <p className="text-[10px] font-bold text-[#56585E] uppercase tracking-wider mb-2">AI Suggestions</p>
                {[
                  "Summarize key parameters of the corpus",
                  "What are the main architecture coordinates?",
                  "Inspect data indexing limitations and constraints"
                ].map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(sug)}
                    className="text-left w-full rounded-xl bg-[#111217] hover:bg-[#181A20] border border-[rgba(255,255,255,0.06)] hover:border-[#7C5CFC]/20 px-3.5 py-2.5 text-xs text-[#8B8D98] hover:text-[#F0F0F3] transition-all cursor-pointer outline-none active:scale-[0.99]"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-2xl mx-auto">
              {messages.map((msg) => {
                const isAssistant = msg.role === 'assistant';
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      "flex gap-4 p-4.5 rounded-2xl border leading-relaxed text-xs",
                      isAssistant
                        ? "bg-[#111217] border-[rgba(255,255,255,0.06)] shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
                        : "bg-[#181A20]/40 border-[rgba(255,255,255,0.04)]"
                    )}
                  >
                    {/* Role Icon */}
                    <div className={cn(
                      "h-8 w-8 rounded-lg border flex items-center justify-center shrink-0 shadow-sm",
                      isAssistant
                        ? "bg-[#7C5CFC]/10 border-[#7C5CFC]/10 text-[#7C5CFC]"
                        : "bg-[#181A20] border-[rgba(255,255,255,0.06)] text-[#8B8D98]"
                    )}>
                      {isAssistant ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>

                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex items-center justify-between select-none">
                        <span className="text-[10px] font-bold text-[#56585E] uppercase tracking-wider">
                          {isAssistant ? 'MLCopilot' : 'Developer'}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="p-1 rounded hover:bg-[#181A20] text-[#56585E] hover:text-[#8B8D98] transition-all"
                            title="Copy message text"
                          >
                            {copiedId === msg.id ? <Check className="h-3.5 w-3.5 text-[#3DD68C]" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                          {!isAssistant && (
                            <button
                              onClick={() => handleRegenerate(msg.content)}
                              className="p-1 rounded hover:bg-[#181A20] text-[#56585E] hover:text-[#8B8D98] transition-all"
                              title="Regenerate prompt answer"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Markdown representation */}
                      <div className="prose prose-invert prose-xs text-[#F0F0F3]/90 leading-relaxed font-sans max-w-none select-text">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>

                      {/* Citations block */}
                      {isAssistant && msg.citations && msg.citations.length > 0 && (
                        <div className="pt-3 border-t border-[rgba(255,255,255,0.06)] mt-4 space-y-2">
                          <span className="text-[9px] font-bold text-[#56585E] uppercase tracking-wider flex items-center gap-1">
                            <Quote className="h-3 w-3 text-[#7C5CFC]" />
                            <span>Context Citations</span>
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.citations.map((cite, cIdx) => (
                              <button
                                key={cIdx}
                                onClick={() => setSelectedCitation(cite)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#181A20] hover:bg-[#1E2028] border border-[rgba(255,255,255,0.06)] px-2.5 py-1 text-[10px] font-medium text-[#8B8D98] hover:text-[#7C5CFC] transition-all cursor-pointer select-none"
                              >
                                <span className="text-[#7C5CFC] font-semibold">[{cIdx + 1}]</span>
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

              {/* Real-time Streaming message preview */}
              {isStreaming && (
                <>
                  {streamingUserMsg && !messages.some(m => m.role === 'user' && m.content === streamingUserMsg) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-4 p-4.5 rounded-2xl border bg-[#181A20]/40 border-[rgba(255,255,255,0.04)] leading-relaxed text-xs"
                    >
                      <div className="h-8 w-8 rounded-lg border flex items-center justify-center shrink-0 bg-[#181A20] border-[rgba(255,255,255,0.06)] text-[#8B8D98]">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-3 min-w-0">
                        <span className="text-[10px] font-bold text-[#56585E] uppercase tracking-wider block">Developer</span>
                        <div className="prose prose-invert prose-xs text-[#F0F0F3]/90 leading-relaxed font-sans max-w-none select-text">
                          {streamingUserMsg}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4 p-4.5 rounded-2xl border bg-[#111217] border-[rgba(255,255,255,0.06)] shadow-[0_4px_16px_rgba(0,0,0,0.3)] leading-relaxed text-xs"
                  >
                    <div className="h-8 w-8 rounded-lg border bg-[#7C5CFC]/10 border-[#7C5CFC]/10 text-[#7C5CFC] flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-3 min-w-0">
                      <span className="text-[10px] font-bold text-[#56585E] uppercase tracking-wider block">MLCopilot</span>
                      {streamingContent ? (
                        <div className="prose prose-invert prose-xs text-[#F0F0F3]/90 leading-relaxed font-sans max-w-none select-text">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {streamingContent}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 py-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#7C5CFC] animate-bounce [animation-delay:-0.3s]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-[#7C5CFC] animate-bounce [animation-delay:-0.15s]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-[#7C5CFC] animate-bounce" />
                        </div>
                      )}

                      {streamingCitations.length > 0 && (
                        <div className="pt-3 border-t border-[rgba(255,255,255,0.06)] mt-4 space-y-2">
                          <span className="text-[9px] font-bold text-[#56585E] uppercase tracking-wider flex items-center gap-1">
                            <Quote className="h-3 w-3 text-[#7C5CFC]" />
                            <span>Context Citations</span>
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {streamingCitations.map((cite, cIdx) => (
                              <button
                                key={cIdx}
                                onClick={() => setSelectedCitation(cite)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#181A20] hover:bg-[#1E2028] border border-[rgba(255,255,255,0.06)] px-2.5 py-1 text-[10px] font-medium text-[#8B8D98] hover:text-[#7C5CFC] transition-all cursor-pointer select-none"
                              >
                                <span className="text-[#7C5CFC] font-semibold">[{cIdx + 1}]</span>
                                <span className="truncate max-w-[120px]">{cite.filename}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </div>
          )}
        </div>

        {/* 3. Floating Composer / Glass Composer */}
        <div className="absolute bottom-6 left-6 right-6 z-20">
          <div className="max-w-2xl mx-auto relative bg-[#111217]/65 backdrop-blur-xl border border-[rgba(255,255,255,0.06)] rounded-2xl p-3.5 shadow-2xl flex flex-col gap-2">
            
            {/* Popups autocomplete triggers */}
            {showMentions && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1E2028] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-2xl z-50 p-2 max-h-48 overflow-y-auto">
                <p className="text-[9px] font-bold text-[#56585E] uppercase tracking-wider px-2.5 py-1 select-none">Scope Query to File Context</p>
                {files.length === 0 ? (
                  <p className="text-[10px] text-[#8B8D98] p-2 font-medium">No documents uploaded. Type file queries...</p>
                ) : (
                  files.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => {
                        setInput(prev => prev.replace(/@$/, `@${file.filename} `));
                        setShowMentions(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[#8B8D98] hover:bg-[#111217] hover:text-[#F0F0F3] transition-all flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Database className="h-3.5 w-3.5 text-[#7C5CFC]" />
                      <span>{file.filename}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {showCommands && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1E2028] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-2xl z-50 p-2 max-h-48 overflow-y-auto">
                <p className="text-[9px] font-bold text-[#56585E] uppercase tracking-wider px-2.5 py-1 select-none">Slash Command Shortcuts</p>
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
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[#8B8D98] hover:bg-[#111217] hover:text-[#F0F0F3] transition-all flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <span className="text-[#7C5CFC] font-mono font-bold">/{action.cmd}</span>
                    <span className="text-[#56585E]">—</span>
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
                className="w-full bg-transparent border-0 pl-1 pr-12 py-1.5 text-xs text-[#F0F0F3] placeholder-[#56585E] transition-all resize-none max-h-24 overflow-y-auto leading-relaxed outline-none"
                disabled={isSendingMessage}
              />
              
              <button
                type="submit"
                disabled={!input.trim() || isSendingMessage}
                className={cn(
                  "absolute right-1 p-1.5 rounded-lg border transition-all cursor-pointer active:scale-[0.95]",
                  input.trim() && !isSendingMessage
                    ? "bg-[#7C5CFC] border-[#7C5CFC]/10 text-white hover:bg-[#6B4FE0]"
                    : "bg-[#181A20] border-[rgba(255,255,255,0.06)] text-[#56585E] cursor-not-allowed"
                )}
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
            
            {/* Context helpers */}
            <div className="flex items-center justify-between text-[9px] text-[#56585E] font-mono font-medium select-none px-1">
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
            className="border-l border-[rgba(255,255,255,0.06)] bg-[#0D0D10] flex flex-col justify-between shrink-0 h-full relative overflow-hidden hidden xl:flex select-none animate-fade-in"
          >
            <div className="p-4 border-b border-[rgba(255,255,255,0.04)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#F0F0F3]">
                <Quote className="h-3.5 w-3.5 text-[#7C5CFC]" />
                <span>Supporting Source Chunk</span>
              </div>
              <button 
                onClick={() => setSelectedCitation(null)}
                className="p-1 rounded-lg text-[#56585E] hover:text-[#F0F0F3] hover:bg-[#181A20] transition-all cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="p-3.5 bg-[#111217] border border-[rgba(255,255,255,0.06)] rounded-xl space-y-1">
                <span className="text-[8px] font-bold text-[#56585E] uppercase tracking-wide">Origin Document</span>
                <p className="text-xs font-semibold text-[#F0F0F3] truncate">{selectedCitation.filename}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[10px] text-[#56585E] font-medium">
                <div className="p-3 bg-[#111217] border border-[rgba(255,255,255,0.06)] rounded-xl">
                  <span>Score Similarity</span>
                  <p className="text-xs font-bold text-[#7C5CFC] mt-1 font-mono">
                    {(selectedCitation.score * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-[#111217] border border-[rgba(255,255,255,0.06)] rounded-xl">
                  <span>Position Order</span>
                  <p className="text-xs font-bold text-[#F0F0F3] mt-1 font-mono">
                    Chunk #{selectedCitation.position}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-[#111217] border border-[rgba(255,255,255,0.06)] rounded-xl space-y-2 relative overflow-hidden select-text">
                <span className="text-[9px] font-bold text-[#56585E] uppercase tracking-wider block">SUPPORTING TEXT EXCERPT</span>
                <p className="text-[#8B8D98] text-xs leading-relaxed italic select-text pl-3 border-l-2 border-[#7C5CFC]/70">
                  &ldquo;{selectedCitation.content}&rdquo;
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
              <div className="p-3.5 bg-[#111217] border border-[rgba(255,255,255,0.06)] rounded-xl space-y-1.5">
                <span className="text-[9px] font-bold text-[#56585E] uppercase tracking-wide">Origin Document</span>
                <p className="font-semibold text-[#F0F0F3]">{selectedCitation.filename}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#111217] border border-[rgba(255,255,255,0.06)] rounded-xl space-y-1.5">
                  <span className="text-[9px] font-bold text-[#56585E] uppercase tracking-wide">Score Match Similarity</span>
                  <p className="font-bold text-[#7C5CFC] font-mono">
                    {(selectedCitation.score * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-[#111217] border border-[rgba(255,255,255,0.06)] rounded-xl space-y-1.5">
                  <span className="text-[9px] font-bold text-[#56585E] uppercase tracking-wide">Position Order</span>
                  <p className="font-semibold text-[#F0F0F3] font-mono">
                    Chunk #{selectedCitation.position}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-[#111217] border border-[rgba(255,255,255,0.06)] rounded-xl space-y-2 relative overflow-hidden">
                <span className="text-[9px] font-bold text-[#56585E] uppercase tracking-wider block">SUPPORTING TEXT EXCERPT</span>
                <p className="text-[#8B8D98] text-xs leading-relaxed italic select-text pl-3 border-l-2 border-[#7C5CFC]/70">
                  &ldquo;{selectedCitation.content}&rdquo;
                </p>
              </div>
            </div>
          )}
        </Drawer>
      </div>
    </div>
  );
}
