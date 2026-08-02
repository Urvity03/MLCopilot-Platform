'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useProjects } from '../../../../hooks/useProjects';
import { useChat } from '../../../../hooks/useChat';
import { useUploads } from '../../../../hooks/useUploads';
import { 
  Plus, 
  Trash2, 
  MessageSquare, 
  Sparkles, 
  Terminal, 
  Quote, 
  X, 
  ArrowUp,
  User, 
  Bot, 
  Copy, 
  Check, 
  RotateCcw,
  Database,
  AtSign,
  Slash,
  Pencil,
  MoreVertical,
  Search,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Drawer } from '../../../../components/ui/drawer';
import { cn } from '../../../../lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { usePreferencesStore } from '../../../../store/preferences';

export default function ChatPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const preferences = usePreferencesStore();
  const { projects } = useProjects();
  const [activeConvId, setActiveConvId] = React.useState<string | undefined>(undefined);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const {
    conversations,
    isLoadingConversations,
    activeConversation,
    isLoadingActiveConversation,
    sendMessage,
    sendMessageStream,
    isSendingMessage,
    deleteConversation,
    renameConversation,
    invalidateChatQueries,
  } = useChat(projectId, activeConvId);

  const { files } = useUploads(projectId);

  // Input Focus & Local Conversation Management state
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [menuOpenConvId, setMenuOpenConvId] = React.useState<string | null>(null);
  const [editingConvId, setEditingConvId] = React.useState<string | null>(null);
  const [editingTitle, setEditingTitle] = React.useState('');
  const [deleteConfirmConvId, setDeleteConfirmConvId] = React.useState<string | null>(null);

  // Active project context
  const activeProject = React.useMemo(() => {
    return (projects || []).find((p) => p.id === projectId);
  }, [projects, projectId]);

  // Set the first conversation as active if none selected
  React.useEffect(() => {
    if ((conversations || []).length > 0 && !activeConvId) {
      setActiveConvId(conversations[0].id);
    }
  }, [conversations, activeConvId]);

  // Local Chat Composer state
  const [input, setInput] = React.useState('');
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = React.useState<any | null>(null);
  const [llmDisplay, setLlmDisplay] = React.useState('Ollama • llama3.1:8b');

  // Dynamically fetch configured LLM info from backend
  React.useEffect(() => {
    async function fetchLLMConfig() {
      try {
        const rawBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        const baseUrl = rawBase.endsWith('/api/v1') ? rawBase : `${rawBase.replace(/\/+$/, '')}/api/v1`;
        const res = await fetch(`${baseUrl}/health/llm`);
        if (res.ok) {
          const data = await res.json();
          if (data?.display_name) {
            setLlmDisplay(data.display_name);
          }
        }
      } catch (err) {
        console.error('Failed to fetch active LLM config:', err);
      }
    }
    fetchLLMConfig();
  }, []);

  // Streaming UI state
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [streamingUserMsg, setStreamingUserMsg] = React.useState<string | null>(null);
  const [streamingContent, setStreamingContent] = React.useState('');
  const [streamingCitations, setStreamingCitations] = React.useState<any[]>([]);

  // Autocomplete triggers
  const [showMentions, setShowMentions] = React.useState(false);
  const [showCommands, setShowCommands] = React.useState(false);

  // Auto-scroll smooth to bottom on new messages / streaming tokens
  const scrollToBottom = () => {
    if (preferences.autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, streamingContent, isStreaming]);

  // Local Optimistic Titles Map
  const [localTitles, setLocalTitles] = React.useState<Record<string, string>>({});

  // Combined conversation list including optimistic active new chat and local titles
  const displayConversations = React.useMemo(() => {
    const list = (conversations || []).map((c) => ({
      ...c,
      title: localTitles[c.id] || c.title || 'New Chat',
    }));

    if (activeConvId && !list.some((c) => c.id === activeConvId)) {
      list.unshift({
        id: activeConvId,
        project_id: projectId,
        title: localTitles[activeConvId] || 'New Chat',
        created_at: new Date().toISOString(),
      });
    }

    return list;
  }, [conversations, activeConvId, projectId, localTitles]);

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
      await sendMessageStream(
        {
          question: currentMsg,
          conversation_id: activeConvId,
        },
        {
          onMetadata: (data) => {
            if (data.conversation_id) {
              const realConvId = data.conversation_id;
              setActiveConvId(realConvId);

              // Auto-generate title for new conversation on first turn
              const targetConv = conversations.find((c) => c.id === activeConvId || c.id === realConvId);
              if (!targetConv || targetConv.title === 'New Chat' || targetConv.title === 'New Conversation') {
                const autoTitle = generateShortTitle(currentMsg);
                renameConversation({ convId: realConvId, title: autoTitle });
              }
            }
            if (data.citations) {
              setStreamingCitations(data.citations);
            }
          },
          onToken: (token) => {
            setStreamingContent((prev) => prev + token);
          },
          onDone: async () => {
            if (invalidateChatQueries) {
              await invalidateChatQueries(activeConvId);
            }
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

  const generateShortTitle = (text: string) => {
    const clean = text.replace(/[@/]/g, '').trim();
    if (!clean) return 'New Chat';
    if (clean.length <= 25) return clean.charAt(0).toUpperCase() + clean.slice(1);
    const words = clean.split(/\s+/).slice(0, 4).join(' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
  };

  const handleCreateNewConversation = () => {
    const newId = crypto.randomUUID();
    setActiveConvId(newId);
    setInput('');
    setShowMentions(false);
    setShowCommands(false);
    setMenuOpenConvId(null);
    setEditingConvId(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const confirmDeleteConversation = (targetConvId: string) => {
    setDeleteConfirmConvId(null);
    setMenuOpenConvId(null);
    const remaining = conversations.filter((c) => c.id !== targetConvId);
    const wasActive = activeConvId === targetConvId;

    deleteConversation(targetConvId);

    if (wasActive) {
      if (remaining.length > 0) {
        setActiveConvId(remaining[0].id);
      } else {
        handleCreateNewConversation();
      }
    }
  };

  const isSavingRenameRef = React.useRef(false);

  const handleSaveRename = (convId: string, customTitle?: string) => {
    if (isSavingRenameRef.current) return;
    isSavingRenameRef.current = true;
    const raw = customTitle !== undefined ? customTitle : editingTitle;
    const trimmed = raw.trim();
    if (trimmed) {
      setLocalTitles((prev) => ({ ...prev, [convId]: trimmed }));
      renameConversation({ convId, title: trimmed });
    }
    setEditingConvId(null);
    setMenuOpenConvId(null);
    setTimeout(() => {
      isSavingRenameRef.current = false;
    }, 200);
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
      <aside className="w-64 border-r border-[rgba(255,255,255,0.06)] bg-[#0D0D10] shrink-0 flex flex-col justify-between hidden md:flex select-none">
        <div className="p-3 border-b border-[rgba(255,255,255,0.04)] shrink-0 space-y-2">
          <Button
            onClick={handleCreateNewConversation}
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 border-[rgba(255,255,255,0.06)] bg-[#111217] text-[#8B8D98] hover:text-white hover:border-[#7C5CFC]/30 hover:bg-[#181A20] transition-all active:scale-[0.98] shadow-xs"
          >
            <Plus className="h-4 w-4 text-[#7C5CFC]" />
            <span className="text-xs font-semibold">New conversation</span>
          </Button>

          {/* Instant Client-Side Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#56585E]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSearchQuery('');
              }}
              placeholder="Search chats..."
              className="w-full bg-[#111217] border border-[rgba(255,255,255,0.06)] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#F0F0F3] placeholder-[#56585E] outline-none focus:border-[#7C5CFC]/40 transition-all font-sans"
            />
          </div>
        </div>

        {/* Conversation list with Optimistic Updates */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 relative">
          {isLoadingConversations ? (
            <div className="space-y-2 p-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 rounded-xl bg-[#111217] animate-pulse border border-[rgba(255,255,255,0.04)]" />
              ))}
            </div>
          ) : (() => {
            const filteredConvs = displayConversations.filter((c) =>
              (c.title || 'New Chat').toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (filteredConvs.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4 space-y-3">
                  <Sparkles className="h-5 w-5 text-[#7C5CFC] animate-pulse" />
                  <p className="text-xs font-semibold text-white">✨ Start a new conversation</p>
                  <p className="text-[10px] text-[#8B8D98]">Ask anything about your code or documents.</p>
                  <button
                    onClick={handleCreateNewConversation}
                    className="px-3 py-1.5 rounded-xl bg-[#7C5CFC] hover:bg-[#6C47FF] text-white text-xs font-semibold transition-all active:scale-95 shadow-sm"
                  >
                    New Chat
                  </button>
                </div>
              );
            }

            return filteredConvs.map((conv) => {
              const isActive = conv.id === activeConvId;
              const isEditing = editingConvId === conv.id;
              const isMenuOpen = menuOpenConvId === conv.id;

              return (
                <div
                  key={conv.id}
                  className={cn(
                    "group relative flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium cursor-pointer transition-all border",
                    isActive
                      ? "bg-[#7C5CFC]/15 text-white border-[#7C5CFC]/30 shadow-[0_0_15px_rgba(124,92,252,0.12)]"
                      : "text-[#8B8D98] hover:bg-[#181A20] hover:text-[#F0F0F3] border-transparent"
                  )}
                  onClick={() => {
                    if (!isEditing) setActiveConvId(conv.id);
                  }}
                >
                  <div className="flex items-center gap-2 truncate min-w-0 flex-1">
                    <MessageSquare className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-[#7C5CFC]" : "text-[#56585E]")} />
                    {isEditing ? (
                      <input
                        type="text"
                        autoFocus
                        defaultValue={editingTitle}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(conv.id, (e.target as HTMLInputElement).value);
                          if (e.key === 'Escape') setEditingConvId(null);
                        }}
                        onBlur={(e) => handleSaveRename(conv.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-[#111217] border border-[#7C5CFC]/50 rounded px-1.5 py-0.5 text-xs text-white outline-none"
                      />
                    ) : (
                      <span className="truncate">{conv.title || 'New Chat'}</span>
                    )}
                  </div>
                  
                  {/* Context Menu Button */}
                  {!isEditing && (
                    <div className="relative shrink-0 flex items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenConvId(isMenuOpen ? null : conv.id);
                        }}
                        className={cn(
                          "p-1 rounded text-[#56585E] hover:text-[#F0F0F3] hover:bg-[#111217] transition-all",
                          isMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                        title="Conversation options"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>

                      {/* Dropdown Menu */}
                      <AnimatePresence>
                        {isMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            transition={{ duration: 0.12 }}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-6 z-40 w-32 rounded-xl bg-[#111217] border border-[rgba(255,255,255,0.08)] py-1 shadow-2xl space-y-0.5"
                          >
                            <button
                              onClick={() => {
                                setMenuOpenConvId(null);
                                setEditingConvId(conv.id);
                                setEditingTitle(conv.title || 'New Chat');
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-[#8B8D98] hover:text-white hover:bg-[#181A20] transition-all"
                            >
                              <Pencil className="h-3 w-3 text-[#7C5CFC]" />
                              <span>Rename</span>
                            </button>
                            <button
                              onClick={() => {
                                setMenuOpenConvId(null);
                                setDeleteConfirmConvId(conv.id);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-[#FF5C74] hover:bg-[#FF5C74]/10 transition-all"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Delete</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      </aside>

      {/* 2. Main Chat Workspace */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#09090B] relative h-full">
        {/* Active conversation info header */}
        <div className="h-12 border-b border-[rgba(255,255,255,0.06)] px-6 flex items-center justify-between bg-[#111217]/40 backdrop-blur-xl shrink-0 select-none">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--primary)]" />
            <span className="text-xs font-semibold text-[#8B8D98]">
              {activeProject ? `Copilot: ${activeProject.name}` : 'AI Chat Interface'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Active LLM Model Provider Display */}
            <div className="flex items-center gap-1.5 rounded-lg bg-[#111217] border border-[rgba(255,255,255,0.06)] px-2.5 py-1 text-[11px] font-medium text-[#8B8D98]">
              <Terminal className="h-3 w-3 text-[var(--primary)]" />
              <span>{llmDisplay}</span>
            </div>
            <span className="text-[9px] bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-md px-2 py-0.5 text-[var(--primary)] font-bold font-mono tracking-wider">
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
                <div className="h-12 w-12 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/15 flex items-center justify-center text-[var(--primary)] mb-4 shadow-lg shadow-[var(--primary)]/5">
                  <Bot className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold text-[#F0F0F3]">Ask MLCopilot anything</h3>
                <p className="text-xs text-[#8B8D98] leading-relaxed mt-1">
                  Query the workspace corpus or ask general programming & ML architecture questions naturally.
                </p>
              </div>

              {/* Suggestions chips */}
              <div className="space-y-2 w-full pt-4 border-t border-[rgba(255,255,255,0.06)]">
                <p className="text-[10px] font-bold text-[#56585E] uppercase tracking-wider mb-2">AI Suggestions</p>
                {[
                  "Summarize key parameters of the corpus",
                  "Explain how machine learning pipelines work",
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
            <div className="space-y-6 max-w-3xl mx-auto pb-8">
              {messages.map((msg) => {
                const isAssistant = msg.role === 'assistant';
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn(
                      "flex gap-3 text-xs leading-relaxed max-w-full",
                      isAssistant ? "justify-start" : "justify-end"
                    )}
                  >
                    {/* Role Icon for Assistant */}
                    {isAssistant && (
                      <div className="h-8 w-8 rounded-xl border flex items-center justify-center shrink-0 bg-[var(--primary)]/10 border-[var(--primary)]/20 text-[var(--primary)] shadow-sm">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}

                    <div className={cn(
                      "space-y-2 min-w-0 max-w-[85%]",
                      isAssistant ? "w-full" : "items-end"
                    )}>
                      {/* Top Header Label & Actions */}
                      <div className={cn(
                        "flex items-center gap-2 select-none px-1",
                        isAssistant ? "justify-between" : "justify-end"
                      )}>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#56585E] uppercase tracking-wider">
                            {isAssistant ? 'MLCopilot' : 'You'}
                          </span>
                          {isAssistant && (
                            msg.citations && msg.citations.length > 0 ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)] text-[9px] font-mono font-bold select-none">
                                RAG • {msg.citations.length} chunk{msg.citations.length > 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#181A20] border border-[rgba(255,255,255,0.06)] text-[#8B8D98] text-[9px] font-mono font-bold select-none">
                                AI
                              </span>
                            )
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="p-1 rounded hover:bg-[#181A20] text-[#56585E] hover:text-[#8B8D98] transition-all cursor-pointer"
                            title="Copy message"
                          >
                            {copiedId === msg.id ? <Check className="h-3.5 w-3.5 text-[#3DD68C]" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                          {!isAssistant && (
                            <button
                              onClick={() => handleRegenerate(msg.content)}
                              className="p-1 rounded hover:bg-[#181A20] text-[#56585E] hover:text-[#8B8D98] transition-all cursor-pointer"
                              title="Regenerate response"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Content Bubble / Card */}
                      <div className={cn(
                        "p-4 rounded-2xl border text-xs shadow-sm",
                        isAssistant
                          ? "bg-[#111217] border-[rgba(255,255,255,0.06)] text-[#F0F0F3]"
                          : "bg-[var(--primary)] border-transparent text-white font-medium shadow-[0_4px_20px_rgba(124,92,252,0.2)]"
                      )}>
                        <div className={cn(
                          "prose prose-xs leading-relaxed font-sans max-w-none select-text",
                          isAssistant ? "prose-invert text-[#F0F0F3]/95" : "text-white"
                        )}>
                          {preferences.markdownRendering ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          ) : (
                            <pre className="whitespace-pre-wrap font-sans text-xs text-[#F0F0F3]/95">{msg.content}</pre>
                          )}
                        </div>

                        {/* Citations block - rendered ONLY when RAG citations exist and showCitations is enabled */}
                        {isAssistant && preferences.showCitations && msg.citations && msg.citations.length > 0 && (
                          <div className="pt-3 border-t border-[rgba(255,255,255,0.06)] mt-3 space-y-2">
                            <span className="text-[9px] font-bold text-[#56585E] uppercase tracking-wider flex items-center gap-1">
                              <Quote className="h-3 w-3 text-[var(--primary)]" />
                              <span>Context Citations</span>
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.citations.map((cite, cIdx) => (
                                <button
                                  key={cIdx}
                                  onClick={() => setSelectedCitation(cite)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#181A20] hover:bg-[#1E2028] border border-[rgba(255,255,255,0.06)] px-2.5 py-1 text-[10px] font-medium text-[#8B8D98] hover:text-[var(--primary)] transition-all cursor-pointer select-none"
                                >
                                  <span className="text-[var(--primary)] font-semibold">[{cIdx + 1}]</span>
                                  <span className="truncate max-w-[120px]">{cite.filename}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Role Icon for User */}
                    {!isAssistant && (
                      <div className="h-8 w-8 rounded-xl border flex items-center justify-center shrink-0 bg-[#181A20] border-[rgba(255,255,255,0.06)] text-[#8B8D98] shadow-sm">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {/* Real-time Streaming message preview */}
              {isStreaming && (
                <>
                  {streamingUserMsg && !messages.some(m => m.role === 'user' && m.content === streamingUserMsg) && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3 text-xs leading-relaxed justify-end max-w-full"
                    >
                      <div className="space-y-2 min-w-0 max-w-[85%] items-end">
                        <div className="flex items-center justify-end select-none px-1">
                          <span className="text-[10px] font-bold text-[#56585E] uppercase tracking-wider">You</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#7C5CFC] to-[#6C47FF] text-white font-medium shadow-[0_4px_20px_rgba(124,92,252,0.2)]">
                          {streamingUserMsg}
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-xl border flex items-center justify-center shrink-0 bg-[#181A20] border-[rgba(255,255,255,0.06)] text-[#8B8D98]">
                        <User className="h-4 w-4" />
                      </div>
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 text-xs leading-relaxed justify-start max-w-full"
                  >
                    <div className="h-8 w-8 rounded-xl border flex items-center justify-center shrink-0 bg-[#7C5CFC]/10 border-[#7C5CFC]/20 text-[#7C5CFC] shadow-sm">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="space-y-2 min-w-0 max-w-[85%] w-full">
                      <div className="flex items-center justify-between select-none px-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#56585E] uppercase tracking-wider">MLCopilot</span>
                          {streamingCitations.length > 0 ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#7C5CFC]/15 border border-[#7C5CFC]/30 text-[#7C5CFC] text-[9px] font-mono font-bold select-none">
                              RAG • {streamingCitations.length} chunk{streamingCitations.length > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#181A20] border border-[rgba(255,255,255,0.06)] text-[#8B8D98] text-[9px] font-mono font-bold select-none">
                              AI
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-[#111217] border border-[rgba(255,255,255,0.06)] text-[#F0F0F3] shadow-sm">
                        {streamingContent ? (
                          <div className="prose prose-invert prose-xs leading-relaxed font-sans max-w-none select-text">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {streamingContent}
                            </ReactMarkdown>
                            <span className="inline-block w-1.5 h-3.5 bg-[#7C5CFC] animate-pulse ml-1 align-middle" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 py-1 text-xs text-[#8B8D98] font-medium select-none">
                            <span className="h-2 w-2 rounded-full bg-[#7C5CFC] animate-ping" />
                            <span>{streamingCitations.length > 0 ? "Analyzing vector embeddings..." : "Querying workspace documents..."}</span>
                          </div>
                        )}

                        {streamingCitations.length > 0 && (
                          <div className="pt-3 border-t border-[rgba(255,255,255,0.06)] mt-3 space-y-2">
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
                    </div>
                  </motion.div>
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 3. Modern ChatGPT/Claude Redesigned Composer */}
        <div className="absolute bottom-6 left-6 right-6 z-20">
          <div className="max-w-2xl mx-auto relative bg-[#13141B]/85 backdrop-blur-2xl border border-[rgba(255,255,255,0.08)] rounded-3xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col gap-2.5 transition-all focus-within:border-[#7C5CFC]/40 focus-within:shadow-[0_0_24px_rgba(124,92,252,0.12)]">
            
            {/* Popups autocomplete triggers */}
            {showMentions && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1E2028] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl z-50 p-2 max-h-48 overflow-y-auto">
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
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1E2028] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl z-50 p-2 max-h-48 overflow-y-auto">
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

            {/* Top Textarea Input Row */}
            <form onSubmit={handleSend} className="w-full">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                placeholder="Ask MLCopilot anything or type @ to filter documents..."
                rows={1}
                className="w-full bg-transparent text-xs text-[#F0F0F3] placeholder-[#56585E] px-2 py-1 outline-none resize-none min-h-[40px] max-h-32 overflow-y-auto leading-relaxed font-sans"
                disabled={isSendingMessage}
              />
              
              {/* Bottom Controls Bar */}
              <div className="flex items-center justify-between pt-1 select-none">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setInput(prev => prev + '@');
                      setShowMentions(true);
                    }}
                    className="flex items-center gap-1 rounded-full bg-[#181A20] hover:bg-[#1E2028] border border-[rgba(255,255,255,0.06)] px-2.5 py-1 text-[10px] font-medium text-[#8B8D98] hover:text-[#F0F0F3] transition-all cursor-pointer"
                    title="Scope context to document (@)"
                  >
                    <AtSign className="h-3 w-3 text-[var(--primary)]" />
                    <span>Doc Context</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInput(prev => prev + '/');
                      setShowCommands(true);
                    }}
                    className="flex items-center gap-1 rounded-full bg-[#181A20] hover:bg-[#1E2028] border border-[rgba(255,255,255,0.06)] px-2.5 py-1 text-[10px] font-medium text-[#8B8D98] hover:text-[#F0F0F3] transition-all cursor-pointer"
                    title="Slash commands (/)"
                  >
                    <Slash className="h-3 w-3 text-[var(--primary)]" />
                    <span>Commands</span>
                  </button>

                  <span className="hidden sm:inline-block text-[9px] text-[#56585E] font-mono ml-2">
                    Shift + Enter for new line
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!input.trim() || isSendingMessage || isStreaming}
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0",
                    input.trim() && !isSendingMessage && !isStreaming
                      ? "bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white shadow-md shadow-[var(--primary)]/20"
                      : "bg-[#1E2028] text-[#56585E] cursor-not-allowed"
                  )}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </form>
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

      {/* 5. Delete Conversation Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmConvId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="bg-[#111217] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl select-none"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#FF5C74]/10 border border-[#FF5C74]/20 flex items-center justify-center text-[#FF5C74] shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Delete Conversation?</h3>
                  <p className="text-xs text-[#8B8D98] mt-0.5">This action cannot be undone.</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setDeleteConfirmConvId(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#181A20] hover:bg-[#1E2028] text-xs font-medium text-[#8B8D98] hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmDeleteConversation(deleteConfirmConvId)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#FF5C74] hover:bg-[#E04B62] text-xs font-semibold text-white transition-all shadow-sm cursor-pointer active:scale-95"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
