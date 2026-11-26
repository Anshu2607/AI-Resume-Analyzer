import { useEffect, useRef, useState } from "react";

import axios from "axios";

import {
  Sparkles,
  Plus,
  Send,
  MessageSquare,
  FileText,
  Database,
  Loader2,
  ShieldCheck,
  Trash2,
  Pencil,
  Archive,
  ArchiveRestore,
  ChevronDown,
  AlertCircle,
  Bot,
  User,
  Menu,
  X,
  BrainCircuit,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";

import conversationService from "../services/conversation.service";

import {
  resumeService,
} from "../services/resume.service";

import type {
  Conversation,
  Message,
} from "../types/conversation.types";

import type {
  Resume,
} from "../types/resume.types";

// Default suggested questions
const suggestedQuestions = [
  "What are my strongest technical skills?",
  "Which job roles are suitable for my profile?",
  "How can I improve my project descriptions?",
  "What skills should I learn next?",
];

// Extract API error messages
const getErrorMessage = (
  error: unknown
): string => {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.message ||
      "Something went wrong."
    );
  }

  return error instanceof Error
    ? error.message
    : "Something went wrong.";
};

export default function AICareerAssistant() {

  // Resume state

  const [resumes, setResumes] =
    useState<Resume[]>([]);

  const [selectedResume, setSelectedResume] =
    useState("");

  // Conversation state

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);

  // Message state

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [question, setQuestion] =
    useState("");

  const [pendingQuestion, setPendingQuestion] =
    useState("");

  // Loading states

  const [loading, setLoading] =
    useState(true);

  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [indexing, setIndexing] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  // Other UI states

  const [consent, setConsent] =
    useState(false);

  const [error, setError] =
    useState("");

  const [sidebarOpen, setSidebarOpen] =
    useState(
      () => window.innerWidth >= 1024
    );

  const [showArchived, setShowArchived] =
    useState(false);

  const [expandedSources, setExpandedSources] =
    useState<Record<string, boolean>>({});

  // Pagination states

  const [conversationPage, setConversationPage] =
    useState(1);

  const [
    hasMoreConversations,
    setHasMoreConversations,
  ] = useState(false);

  const [messagePage, setMessagePage] =
    useState(1);

  const [
    hasOlderMessages,
    setHasOlderMessages,
  ] = useState(false);

  // References

  const bottomRef =
    useRef<HTMLDivElement | null>(null);

  const chatContainerRef =
    useRef<HTMLDivElement | null>(null);

  const operationLock =
    useRef(false);

  const historyRequestId =
    useRef(0);

  const skipNextAutoScroll =
    useRef(false);

  const busy =
    sending ||
    indexing ||
    creating ||
    historyLoading;

  // =====================================
  // LOAD INITIAL DATA
  // =====================================

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {

        setLoading(true);

        const [resumeData, conversationData] =
          await Promise.all([
            resumeService.getAll(),

            conversationService.getConversations(
              1,
              50
            ),
          ]);

        if (cancelled) return;

        // Corrected ResumeListResponse handling
        const processedResumes =
          resumeData.data.filter(
            (resume: Resume) =>
              resume.status === "processed"
          );

        setResumes(processedResumes);

        setConversations(
          conversationData.conversations
        );

        setHasMoreConversations(
          conversationData.pagination.totalPages > 1
        );

        if (processedResumes.length > 0) {

          setSelectedResume(
            processedResumes[0]._id
          );

        }

      } catch (error) {

        if (!cancelled) {
          setError(
            getErrorMessage(error)
          );
        }

      } finally {

        if (!cancelled) {
          setLoading(false);
        }

      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };

  }, []);

  // =====================================
  // AUTOMATIC CHAT SCROLL
  // =====================================

  useEffect(() => {

    if (skipNextAutoScroll.current) {

      skipNextAutoScroll.current = false;

      return;
    }

    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });

  }, [
    messages.length,
    pendingQuestion,
    sending,
  ]);

  // =====================================
  // UPDATE CONVERSATION LIST
  // =====================================

  const updateConversationList = (
    conversation: Conversation
  ) => {

    setConversations((previous) => [
      conversation,

      ...previous.filter(
        (item) =>
          item._id !== conversation._id
      ),
    ].sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() -
        new Date(a.lastMessageAt).getTime()
    ));

  };

  // =====================================
  // LOAD MORE CONVERSATIONS
  // =====================================

  const loadMoreConversations = async () => {

    if (operationLock.current) return;

    operationLock.current = true;

    setHistoryLoading(true);

    try {

      setError("");

      const nextPage =
        conversationPage + 1;

      const result =
        await conversationService.getConversations(
          nextPage,
          50
        );

      setConversations((previous) => {

        const existingIds = new Set(
          previous.map(
            (item) => item._id
          )
        );

        return [
          ...previous,

          ...result.conversations.filter(
            (item) =>
              !existingIds.has(item._id)
          ),
        ];

      });

      setConversationPage(nextPage);

      setHasMoreConversations(
        nextPage < result.pagination.totalPages
      );

    } catch (error) {

      setError(
        getErrorMessage(error)
      );

    } finally {

      operationLock.current = false;

      setHistoryLoading(false);

    }
  };

  // =====================================
  // START NEW CHAT
  // =====================================

  const startNewChat = () => {

    if (
      busy ||
      operationLock.current
    ) return;

    historyRequestId.current += 1;

    setActiveConversation(null);

    setMessages([]);

    setQuestion("");

    setPendingQuestion("");

    setError("");

    setMessagePage(1);

    setHasOlderMessages(false);

    setExpandedSources({});

    setShowArchived(false);

    if (resumes.length > 0) {

      setSelectedResume(
        resumes[0]._id
      );

    }

    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }

  };

  // =====================================
  // AUTOMATIC RESUME INDEXING
  // =====================================

  const ensureResumeIndexed = async (
    resumeId: string
  ) => {

    const status =
      await conversationService.getIndexingStatus(
        resumeId
      );

    if (status.indexed) return;

    setIndexing(true);

    try {

      await conversationService.indexResume(
        resumeId
      );

    } finally {

      setIndexing(false);

    }
  };

  // =====================================
  // CREATE CONVERSATION
  // =====================================

  const createNewConversation = async () => {

    if (!selectedResume) {

      throw new Error(
        "Please select a processed resume first."
      );

    }

    setCreating(true);

    try {

      await ensureResumeIndexed(
        selectedResume
      );

      const conversation =
        await conversationService.createConversation(
          selectedResume
        );

      setActiveConversation(
        conversation
      );

      updateConversationList(
        conversation
      );

      setMessages([]);

      setMessagePage(1);

      setHasOlderMessages(false);

      return conversation;

    } finally {

      setCreating(false);

    }
  };

  // =====================================
  // OPEN EXISTING CONVERSATION
  // =====================================

  const openConversation = async (
    conversationId: string
  ) => {

    if (
      busy ||
      operationLock.current
    ) return;

    operationLock.current = true;

    const requestId =
      ++historyRequestId.current;

    try {

      setHistoryLoading(true);

      setError("");

      const result =
        await conversationService.getConversation(
          conversationId,
          1,
          50
        );

      if (
        requestId !== historyRequestId.current
      ) {
        return;
      }

      setActiveConversation(
        result.conversation
      );

      setSelectedResume(
        result.conversation.resumeId
      );

      setMessages(
        result.messages
      );

      setMessagePage(1);

      setHasOlderMessages(
        result.pagination.totalPages > 1
      );

      setQuestion("");

      setExpandedSources({});

      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }

    } catch (error) {

      setError(
        getErrorMessage(error)
      );

    } finally {

      operationLock.current = false;

      setHistoryLoading(false);

    }
  };

  // =====================================
  // LOAD OLDER MESSAGES
  // =====================================

  const loadOlderMessages = async () => {

    if (
      !activeConversation ||
      operationLock.current
    ) return;

    operationLock.current = true;

    setHistoryLoading(true);

    try {

      setError("");

      const nextPage =
        messagePage + 1;

      const container =
        chatContainerRef.current;

      const previousHeight =
        container?.scrollHeight || 0;

      const previousTop =
        container?.scrollTop || 0;

      const result =
        await conversationService.getConversation(
          activeConversation._id,
          nextPage,
          50
        );

      skipNextAutoScroll.current = true;

      setMessages((previous) => {

        const existingIds = new Set(
          previous.map(
            (item) => item._id
          )
        );

        return [
          ...result.messages.filter(
            (item) =>
              !existingIds.has(item._id)
          ),

          ...previous,
        ];

      });

      setMessagePage(nextPage);

      setHasOlderMessages(
        nextPage < result.pagination.totalPages
      );

      requestAnimationFrame(() => {

        if (container) {

          container.scrollTop =
            previousTop +
            container.scrollHeight -
            previousHeight;

        }
      });

    } catch (error) {

      setError(
        getErrorMessage(error)
      );

    } finally {

      operationLock.current = false;

      setHistoryLoading(false);

    }
  };

  // =====================================
  // SEND QUESTION
  // =====================================

  const sendQuestion = async (
    value: string = question
  ) => {

    const normalizedQuestion =
      value.trim();

    if (
      operationLock.current ||
      busy
    ) return;

    if (normalizedQuestion.length < 5) {

      setError(
        "Enter a question containing at least 5 characters."
      );

      return;
    }

    if (normalizedQuestion.length > 1000) {

      setError(
        "Question must not exceed 1000 characters."
      );

      return;
    }

    if (!selectedResume) {

      setError(
        "Please select a processed resume."
      );

      return;
    }

    if (!consent) {

      setError(
        "Please acknowledge external AI processing before continuing."
      );

      return;
    }

    if (
      activeConversation?.status === "archived"
    ) {

      setError(
        "Restore this conversation before sending messages."
      );

      return;
    }

    operationLock.current = true;

    try {

      setError("");

      setSending(true);

      setPendingQuestion(
        normalizedQuestion
      );

      setQuestion("");

      const conversation =
        activeConversation ||
        await createNewConversation();

      // Ensure embeddings exist
      if (activeConversation) {

        await ensureResumeIndexed(
          conversation.resumeId
        );

      }

      // Generate RAG response
      const result =
        await conversationService.sendMessage(
          conversation._id,
          {
            question: normalizedQuestion,
            limit: 5,
            consent: true,
          }
        );

      // Append messages and retain latest page
      setMessages((previous) => [
        ...previous,

        result.userMessage,

        result.assistantMessage,
      ].slice(-50));

      setActiveConversation(
        result.conversation
      );

      updateConversationList(
        result.conversation
      );

      setMessagePage(1);

      setHasOlderMessages(
        result.conversation.messageCount > 50
      );

      setExpandedSources({});

    } catch (error) {

      setError(
        getErrorMessage(error)
      );

      setQuestion(
        normalizedQuestion
      );

    } finally {

      operationLock.current = false;

      setSending(false);

      setPendingQuestion("");

    }
  };

  // =====================================
  // RENAME CONVERSATION
  // =====================================

  const handleRename = async (
    conversation: Conversation
  ) => {

    if (operationLock.current) return;

    const title = window.prompt(
      "Rename conversation",
      conversation.title
    );

    if (!title?.trim()) return;

    if (title.trim().length > 150) {

      setError(
        "Conversation title must not exceed 150 characters."
      );

      return;
    }

    operationLock.current = true;

    setHistoryLoading(true);

    try {

      setError("");

      const updated =
        await conversationService.renameConversation(
          conversation._id,
          title.trim()
        );

      updateConversationList(updated);

      setActiveConversation((previous) =>
        previous?._id === updated._id
          ? updated
          : previous
      );

    } catch (error) {

      setError(
        getErrorMessage(error)
      );

    } finally {

      operationLock.current = false;

      setHistoryLoading(false);

    }
  };

  // =====================================
  // ARCHIVE OR RESTORE CONVERSATION
  // =====================================

  const handleArchive = async (
    conversation: Conversation
  ) => {

    if (operationLock.current) return;

    operationLock.current = true;

    setHistoryLoading(true);

    try {

      setError("");

      const status =
        conversation.status === "active"
          ? "archived"
          : "active";

      const updated =
        await conversationService.updateStatus(
          conversation._id,
          status
        );

      updateConversationList(updated);

      setActiveConversation((previous) =>
        previous?._id === updated._id
          ? updated
          : previous
      );

    } catch (error) {

      setError(
        getErrorMessage(error)
      );

    } finally {

      operationLock.current = false;

      setHistoryLoading(false);

    }
  };

  // =====================================
  // DELETE CONVERSATION
  // =====================================

  const handleDelete = async (
    conversation: Conversation
  ) => {

    if (operationLock.current) return;

    const confirmed = window.confirm(
      "Delete this conversation and all its messages permanently?"
    );

    if (!confirmed) return;

    operationLock.current = true;

    setHistoryLoading(true);

    try {

      setError("");

      await conversationService.deleteConversation(
        conversation._id
      );

      setConversations((previous) =>
        previous.filter(
          (item) =>
            item._id !== conversation._id
        )
      );

      if (
        activeConversation?._id ===
        conversation._id
      ) {

        setActiveConversation(null);

        setMessages([]);

        setQuestion("");

        setMessagePage(1);

        setHasOlderMessages(false);

        setExpandedSources({});

      }

    } catch (error) {

      setError(
        getErrorMessage(error)
      );

    } finally {

      operationLock.current = false;

      setHistoryLoading(false);

    }
  };

  // =====================================
  // TOGGLE SOURCE VISIBILITY
  // =====================================

  const toggleSources = (
    messageId: string
  ) => {

    setExpandedSources((previous) => ({
      ...previous,

      [messageId]:
        !previous[messageId],
    }));

  };

  // Filter conversations by status

  const visibleConversations =
    conversations.filter(
      (conversation) =>
        conversation.status ===
        (showArchived ? "archived" : "active")
    );

  // Find the selected resume

  const currentResume =
    resumes.find(
      (resume) =>
        resume._id === selectedResume
    );

  // =====================================
  // INITIAL LOADING SCREEN
  // =====================================

  if (loading) {

    return (
      <div className="flex min-h-[70vh] items-center justify-center">

        <div className="text-center">

          <Loader2
            className="mx-auto mb-4 animate-spin text-violet-500"
            size={36}
          />

          <p className="text-sm text-slate-400">

            Loading your career workspace...

          </p>

        </div>

      </div>
    );
  }

  // =====================================
  // MAIN INTERFACE
  // =====================================

  return (

    <div className="relative flex h-[calc(100dvh-7rem)] min-h-130 overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1120] text-slate-100">

      {/* Mobile sidebar overlay */}

      {sidebarOpen && (

        <button
          type="button"
          aria-label="Close conversations"
          onClick={() =>
            setSidebarOpen(false)
          }
          className="absolute inset-0 z-10 bg-black/50 lg:hidden"
        />

      )}

      {/* Conversation Sidebar */}

      {sidebarOpen && (

        <aside className="absolute inset-y-0 left-0 z-20 flex w-64 shrink-0 flex-col border-r border-slate-800 bg-[#101827] lg:static">

          {/* Sidebar Header */}

          <div className="border-b border-slate-800 p-4">

            <div className="mb-5 flex items-center justify-between">

              <div className="flex items-center gap-2">

                <BrainCircuit
                  size={21}
                  className="text-violet-400"
                />

                <span className="text-sm font-semibold">

                  Career Assistant

                </span>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSidebarOpen(false)
                }
                aria-label="Close sidebar"
                className="text-slate-400 hover:text-white"
              >

                <X size={17} />

              </button>

            </div>

            {/* New Conversation Button */}

            <button
              type="button"
              onClick={startNewChat}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium transition hover:bg-violet-500 disabled:opacity-50"
            >

              <Plus size={18} />

              New Conversation

            </button>

          </div>

          {/* Active and Archived Tabs */}

          <div className="flex gap-1 border-b border-slate-800 p-3">

            <button
              type="button"
              onClick={() =>
                setShowArchived(false)
              }
              className={`flex-1 rounded-lg py-2 text-xs ${
                !showArchived
                  ? "bg-slate-700 text-white"
                  : "text-slate-400"
              }`}
            >

              Active

            </button>

            <button
              type="button"
              onClick={() =>
                setShowArchived(true)
              }
              className={`flex-1 rounded-lg py-2 text-xs ${
                showArchived
                  ? "bg-slate-700 text-white"
                  : "text-slate-400"
              }`}
            >

              Archived

            </button>

          </div>

          {/* Conversation List */}

          <div className="flex-1 overflow-y-auto p-3">

            <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">

              Conversations

            </p>

            {visibleConversations.length === 0 && (

              <p className="px-2 py-6 text-center text-xs text-slate-500">

                No conversations found.

              </p>

            )}

            {visibleConversations.map(
              (conversation) => (

                <div
                  key={conversation._id}
                  className={`group mb-2 rounded-xl border p-3 transition ${
                    activeConversation?._id ===
                    conversation._id
                      ? "border-violet-500/30 bg-violet-500/10"
                      : "border-transparent hover:bg-slate-800/70"
                  }`}
                >

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void openConversation(
                        conversation._id
                      )
                    }
                    className="flex w-full items-start gap-2 text-left disabled:opacity-50"
                  >

                    <MessageSquare
                      size={15}
                      className="mt-0.5 shrink-0 text-violet-400"
                    />

                    <div className="min-w-0">

                      <p className="truncate text-xs font-medium text-slate-200">

                        {conversation.title}

                      </p>

                      <p className="mt-1 text-[10px] text-slate-500">

                        {new Date(
                          conversation.lastMessageAt
                        ).toLocaleDateString()}

                      </p>

                    </div>

                  </button>

                  {/* Conversation Actions */}

                  <div className="mt-3 flex justify-end gap-3 text-slate-500">

                    <button
                      type="button"
                      title="Rename"
                      aria-label="Rename conversation"
                      disabled={busy}
                      onClick={() =>
                        void handleRename(
                          conversation
                        )
                      }
                      className="hover:text-violet-400 disabled:opacity-40"
                    >

                      <Pencil size={13} />

                    </button>

                    <button
                      type="button"
                      title={
                        conversation.status === "active"
                          ? "Archive"
                          : "Restore"
                      }
                      aria-label={
                        conversation.status === "active"
                          ? "Archive conversation"
                          : "Restore conversation"
                      }
                      disabled={busy}
                      onClick={() =>
                        void handleArchive(
                          conversation
                        )
                      }
                      className="hover:text-amber-400 disabled:opacity-40"
                    >

                      {conversation.status === "active" ? (

                        <Archive size={13} />

                      ) : (

                        <ArchiveRestore size={13} />

                      )}

                    </button>

                    <button
                      type="button"
                      title="Delete"
                      aria-label="Delete conversation"
                      disabled={busy}
                      onClick={() =>
                        void handleDelete(
                          conversation
                        )
                      }
                      className="hover:text-red-400 disabled:opacity-40"
                    >

                      <Trash2 size={13} />

                    </button>

                  </div>

                </div>

              )
            )}

            {hasMoreConversations && (

              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void loadMoreConversations()
                }
                className="w-full rounded-lg p-2 text-xs text-violet-400 hover:bg-slate-800"
              >

                Load more conversations

              </button>

            )}

          </div>

          {/* RAG Information Card */}

          <div className="border-t border-slate-800 p-4">

            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3">

              <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">

                <Database size={15} />

                RAG-powered retrieval

              </div>

              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">

                Semantic search with resume-based
                supporting evidence.

              </p>

            </div>

          </div>

        </aside>

      )}

      {/* Main Chat Workspace */}

      <main className="flex min-w-0 flex-1 flex-col">

        {/* Chat Header */}

        <header className="border-b border-slate-800 px-5 py-4">

          <div className="flex items-center gap-3">

            {!sidebarOpen && (

              <button
                type="button"
                onClick={() =>
                  setSidebarOpen(true)
                }
                aria-label="Open sidebar"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"
              >

                <Menu size={20} />

              </button>

            )}

            <div className="rounded-xl bg-violet-500/10 p-3">

              <Sparkles
                size={22}
                className="text-violet-400"
              />

            </div>

            <div className="min-w-0">

              <h1 className="truncate text-lg font-semibold">

                AI Career Assistant

              </h1>

              <p className="text-xs text-slate-400">

                Intelligent, resume-grounded career guidance

              </p>

            </div>

          </div>

          {/* Resume Selection */}

          <div className="mt-4 flex flex-wrap items-center gap-3">

            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5">

              <FileText
                size={17}
                className="shrink-0 text-violet-400"
              />

              <select
                aria-label="Select resume"
                value={selectedResume}
                disabled={
                  busy ||
                  activeConversation !== null
                }
                onChange={(event) =>
                  setSelectedResume(
                    event.target.value
                  )
                }
                className="w-full min-w-0 bg-transparent text-xs text-slate-200 outline-none disabled:opacity-70"
              >

                <option
                  value=""
                  className="bg-slate-900"
                >

                  Select a processed resume

                </option>

                {resumes.map((resume) => (

                  <option
                    key={resume._id}
                    value={resume._id}
                    className="bg-slate-900"
                  >

                    {resume.originalName}

                  </option>

                ))}

                {selectedResume &&
                  !currentResume && (

                    <option value={selectedResume}>

                      Resume unavailable

                    </option>

                  )}

              </select>

            </div>

            {currentResume && (

              <div className="flex items-center gap-1.5 text-xs text-emerald-400">

                <CheckCircle2 size={14} />

                Resume selected

              </div>

            )}

          </div>

          {activeConversation && (

            <p className="mt-2 text-[11px] text-slate-500">

              Start a new conversation to select
              a different resume.

            </p>

          )}

        </header>

        {/* Error Message */}

        {error && (

          <div
            role="alert"
            className="mx-5 mt-3 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300"
          >

            <AlertCircle
              size={17}
              className="shrink-0"
            />

            <span className="flex-1">

              {error}

            </span>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >

              <X size={16} />

            </button>

          </div>

        )}

        {/* Chat Messages */}

        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-5 py-6"
        >

          <div className="mx-auto max-w-4xl">

            {/* Load Older Messages */}

            {hasOlderMessages && (

              <div className="mb-5 text-center">

                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void loadOlderMessages()
                  }
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-400 hover:bg-slate-800"
                >

                  Load older messages

                </button>

              </div>

            )}

            {/* History Loading */}

            {historyLoading && (

              <div className="mb-5 flex justify-center">

                <Loader2
                  size={21}
                  className="animate-spin text-violet-400"
                />

              </div>

            )}

            {/* Empty Conversation State */}

            {messages.length === 0 &&
              !sending &&
              !historyLoading && (

                <div className="mx-auto max-w-2xl py-8 text-center">

                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-violet-500/20 bg-violet-500/10">

                    <BrainCircuit
                      size={40}
                      className="text-violet-400"
                    />

                  </div>

                  <h2 className="text-2xl font-semibold tracking-tight">

                    How can I help your career?

                  </h2>

                  <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">

                    Explore your resume, discover career
                    opportunities and receive personalized
                    recommendations supported by your
                    professional experience.

                  </p>

                  {resumes.length === 0 && (

                    <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">

                      Upload a PDF resume from the Resume
                      Analysis page before starting a chat.

                    </div>

                  )}

                  {/* Suggested Starter Questions */}

                  <div className="mt-8 grid gap-3 sm:grid-cols-2">

                    {suggestedQuestions.map(
                      (item) => (

                        <button
                          type="button"
                          key={item}
                          disabled={
                            busy ||
                            !selectedResume ||
                            activeConversation?.status ===
                              "archived"
                          }
                          onClick={() =>
                            setQuestion(item)
                          }
                          className="group flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-left transition hover:border-violet-500/40 hover:bg-violet-500/5 disabled:opacity-40"
                        >

                          <Sparkles
                            size={16}
                            className="mt-0.5 shrink-0 text-violet-400"
                          />

                          <span className="flex-1 text-xs leading-relaxed text-slate-300">

                            {item}

                          </span>

                          <ArrowUpRight
                            size={15}
                            className="shrink-0 text-slate-500 group-hover:text-violet-400"
                          />

                        </button>

                      )
                    )}

                  </div>

                </div>

              )}

            {/* Stored Messages */}

            <div className="space-y-7">

              {messages.map((message) => (

                <div
                  key={message._id}
                  className={`flex items-start gap-3 ${
                    message.role === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >

                  {/* Assistant Avatar */}

                  {message.role === "assistant" && (

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15">

                      <Bot
                        size={20}
                        className="text-violet-400"
                      />

                    </div>

                  )}

                  {/* Message Bubble */}

                  <div
                    className={`min-w-0 ${
                      message.role === "user"
                        ? "max-w-[85%] rounded-2xl rounded-tr-sm bg-violet-600 px-4 py-3"
                        : "max-w-[92%] flex-1 rounded-2xl border border-slate-800 bg-[#111827] p-5"
                    }`}
                  >

                    {message.role === "assistant" && (

                      <div className="mb-3 flex flex-wrap items-center gap-2">

                        <span className="text-sm font-semibold text-violet-300">

                          CareerLens Assistant

                        </span>

                        {message.metadata?.confidence && (

                          <span
                            className={`rounded-full px-2 py-1 text-[10px] ${
                              message.metadata.confidence ===
                              "high"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : message.metadata.confidence ===
                                  "medium"
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-slate-700 text-slate-300"
                            }`}
                          >

                            AI confidence:{" "}
                            {message.metadata.confidence}

                          </span>

                        )}

                      </div>

                    )}

                    {/* Message Content */}

                    <div className="whitespace-pre-wrap wrap-break-word text-sm leading-7 text-slate-100">

                      {message.content}

                    </div>

                    {/* Insufficient Context Notice */}

                    {message.metadata
                      ?.insufficientContext && (

                        <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-300">

                          <AlertCircle size={16} />

                          Limited supporting resume information.

                        </div>

                      )}

                    {/* Verified Supporting Evidence */}

                    {(message.supportingEvidence?.length ?? 0) > 0 && (

                      <div className="mt-5 space-y-3">

                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">

                          <ShieldCheck size={17} />

                          Verified Supporting Excerpts

                        </div>

                        {message.supportingEvidence.map(
                          (evidence, index) => (

                            <div
                              key={`${evidence.sourceId}-${index}`}
                              className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3"
                            >

                              <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">

                                <FileText size={13} />

                                Source {evidence.sourceId}

                              </div>

                              <p className="wrap-break-word text-xs leading-relaxed text-slate-300">

                                {evidence.evidence}

                              </p>

                            </div>

                          )
                        )}

                      </div>

                    )}

                    {/* Retrieved Sources */}

                    {(message.sources?.length ?? 0) > 0 && (

                      <div className="mt-4">

                        <button
                          type="button"
                          onClick={() =>
                            toggleSources(
                              message._id
                            )
                          }
                          aria-expanded={
                            !!expandedSources[message._id]
                          }
                          className="flex items-center gap-2 text-xs text-slate-400 hover:text-violet-400"
                        >

                          <Database size={14} />

                          View retrieved sources
                          ({message.sources.length})

                          <ChevronDown
                            size={14}
                            className={`transition ${
                              expandedSources[message._id]
                                ? "rotate-180"
                                : ""
                            }`}
                          />

                        </button>

                        {expandedSources[message._id] && (

                          <div className="mt-3 space-y-3">

                            {message.sources.map(
                              (source) => (

                                <div
                                  key={source.sourceId}
                                  className="rounded-lg border border-slate-700 bg-slate-950/40 p-3"
                                >

                                  <div className="mb-2 flex flex-wrap justify-between gap-2 text-[10px] text-violet-300">

                                    <span>

                                      {source.sourceId}
                                      {" · Chunk "}
                                      {source.chunkIndex + 1}

                                    </span>

                                    <span>

                                      Similarity score:{" "}
                                      {source.score.toFixed(3)}

                                    </span>

                                  </div>

                                  <p className="whitespace-pre-wrap wrap-break-word text-xs leading-relaxed text-slate-400">

                                    {source.content}

                                  </p>

                                </div>

                              )
                            )}

                          </div>

                        )}

                      </div>

                    )}

                    {/* Suggested Follow-Up Questions */}

                    {(message.followUpQuestions?.length ?? 0) > 0 && (

                      <div className="mt-5 border-t border-slate-800 pt-4">

                        <p className="mb-3 text-xs font-medium text-slate-400">

                          Suggested questions

                        </p>

                        <div className="flex flex-wrap gap-2">

                          {message.followUpQuestions.map(
                            (item, index) => (

                              <button
                                type="button"
                                key={index}
                                disabled={
                                  busy ||
                                  activeConversation?.status ===
                                    "archived"
                                }
                                onClick={() =>
                                  setQuestion(item)
                                }
                                className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-left text-xs text-violet-300 hover:bg-violet-500/10 disabled:opacity-40"
                              >

                                {item}

                              </button>

                            )
                          )}

                        </div>

                      </div>

                    )}

                    {/* AI Response Metadata */}

                    {message.metadata && (

                      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-800 pt-3 text-[10px] text-slate-500">

                        <span>

                          {message.metadata.provider ||
                            "No provider"}

                        </span>

                        <span>

                          {message.metadata.modelUsed ||
                            "No model called"}

                        </span>

                        <span>

                          {(
                            message.metadata.processingTime /
                            1000
                          ).toFixed(2)}

                          s

                        </span>

                      </div>

                    )}

                  </div>

                  {/* User Avatar */}

                  {message.role === "user" && (

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-700">

                      <User size={18} />

                    </div>

                  )}

                </div>

              ))}

            </div>

            {/* Pending User Message */}

            {pendingQuestion && (

              <div className="mt-7 flex justify-end gap-3">

                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-violet-600 px-4 py-3 text-sm">

                  {pendingQuestion}

                </div>

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-700">

                  <User size={18} />

                </div>

              </div>

            )}

            {/* AI Processing State */}

            {sending && (

              <div className="mt-7 flex items-center gap-3">

                <div className="rounded-xl bg-violet-500/10 p-2.5">

                  <Bot
                    size={20}
                    className="text-violet-400"
                  />

                </div>

                <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">

                  <Loader2
                    size={18}
                    className="animate-spin text-violet-400"
                  />

                  <span className="text-xs text-slate-400">

                    {indexing
                      ? "Generating resume embeddings..."
                      : creating
                      ? "Preparing your conversation..."
                      : "Retrieving evidence and generating your answer..."}

                  </span>

                </div>

              </div>

            )}

            <div ref={bottomRef} />

          </div>

        </div>

        {/* Question Composer */}

        <footer className="border-t border-slate-800 bg-[#0d1422] px-5 py-4">

          <div className="mx-auto max-w-4xl">

            {/* External AI Consent */}

            <label className="mb-3 flex cursor-pointer items-start gap-2.5">

              <input
                type="checkbox"
                checked={consent}
                disabled={sending}
                onChange={(event) =>
                  setConsent(
                    event.target.checked
                  )
                }
                className="mt-0.5 h-4 w-4 shrink-0 accent-violet-600"
              />

              <span className="text-[11px] leading-relaxed text-slate-400">

                I agree that my question and retrieved
                resume excerpts may be processed by
                Groq or Google Gemini to generate AI
                responses. Use synthetic resumes during
                development.

              </span>

            </label>

            {/* Archived Conversation Notice */}

            {activeConversation?.status === "archived" && (

              <p className="mb-3 text-xs text-amber-400">

                This conversation is archived.
                Restore it from the sidebar to continue.

              </p>

            )}

            {/* Missing Resume Notice */}

            {selectedResume && !currentResume && (

              <p className="mb-3 text-xs text-amber-400">

                The resume associated with this conversation
                is unavailable. Start a new conversation
                using an available resume.

              </p>

            )}

            {/* Question Form */}

            <form
              onSubmit={(event) => {

                event.preventDefault();

                void sendQuestion();

              }}
              className="flex items-end gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-3 transition focus-within:border-violet-500/50"
            >

              <textarea
                rows={2}
                maxLength={1000}
                value={question}
                disabled={
                  busy ||
                  !selectedResume ||
                  !currentResume ||
                  activeConversation?.status ===
                    "archived"
                }
                aria-label="Ask a question"
                placeholder="Ask a question about your resume..."
                onChange={(event) =>
                  setQuestion(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {

                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {

                    event.preventDefault();

                    void sendQuestion();

                  }

                }}
                className="min-w-0 flex-1 resize-none bg-transparent p-1 text-sm leading-relaxed text-slate-200 outline-none placeholder:text-slate-600"
              />

              <button
                type="submit"
                aria-label="Send question"
                disabled={
                  busy ||
                  !consent ||
                  !selectedResume ||
                  !currentResume ||
                  question.trim().length < 5 ||
                  activeConversation?.status ===
                    "archived"
                }
                className="rounded-xl bg-violet-600 p-3 text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
              >

                {sending ? (

                  <Loader2
                    size={19}
                    className="animate-spin"
                  />

                ) : (

                  <Send size={19} />

                )}

              </button>

            </form>

            {/* Composer Footer */}

            <div className="mt-2 flex justify-between gap-3 text-[10px] text-slate-500">

              <span>

                AI-generated guidance may contain errors.

              </span>

              <span>

                {question.length}/1000

              </span>

            </div>

          </div>

        </footer>

      </main>

    </div>

  );
}