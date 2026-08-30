import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import { CaseDocument, CaseMessage } from "../types";
import { ArrowLeft, Send, Loader2, Download, RefreshCw, Paperclip, FileText, Server, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function CaseView() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [caseDoc, setCaseDoc] = useState<CaseDocument | null>(null);
  const isArchived = caseDoc?.archived === true;
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleStr, setEditTitleStr] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      // Append file content to input, or set it if empty. Limit if too large.
      const maxChars = 25000;
      let finalContent = content;
      if (content.length > maxChars) {
        finalContent = content.substring(0, maxChars) + "\n\n...[FILE TRUNCATED DUE TO SIZE]...";
      }
      
      const fileHeader = `\`\`\`${file.name.split('.').pop() || ''}\n// File: ${file.name}\n${finalContent}\n\`\`\``;
      setInput(prev => prev ? prev + "\n\n" + fileHeader : fileHeader);
    };
    reader.readAsText(file);
    // Reset input so the same file can be uploaded again
    e.target.value = '';
  };

  useEffect(() => {
    if (!user || !id) return;
    const fetchCase = async () => {
      const docRef = doc(db, "users", user.uid, "cases", id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        setCaseDoc({ id: snapshot.id, ...snapshot.data() } as CaseDocument);
      } else {
        navigate("/");
      }
    };
    fetchCase();
  }, [user, id, navigate]);

  const hasTriggeredInitialChat = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [caseDoc?.messages]);

  useEffect(() => {
    if (!caseDoc || !user || !id) return;
    
    const messages = caseDoc.messages || [];
    // If the case has exactly 1 message, it's from the user (seeded scenario), and we haven't triggered it yet
    if (messages.length === 1 && messages[0].role === "user" && !hasTriggeredInitialChat.current) {
      hasTriggeredInitialChat.current = true;
      triggerInitialChat(messages);
    }
  }, [caseDoc, user, id]);

  const triggerInitialChat = async (currentMessages: CaseMessage[]) => {
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: currentMessages }),
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const modelMessage: CaseMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: data.text,
        timestamp: Date.now(),
      };

      const finalMessages = [...currentMessages, modelMessage];
      
      const updatePayload = {
        messages: finalMessages,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(doc(db, "users", user.uid, "cases", id), updatePayload);
      setCaseDoc(prev => prev ? { ...prev, messages: finalMessages } : null);
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !caseDoc || !user || !id) return;

    const userMessage: CaseMessage = {
      id: Date.now().toString(),
      role: "user",
      text: input,
      timestamp: Date.now(),
    };

    const newMessages = [...(caseDoc.messages || []), userMessage];
    
    // Optimistic update
    setCaseDoc(prev => prev ? { ...prev, messages: newMessages } : null);
    setInput("");
    setLoading(true);

    try {
      // Limit to last 15 messages to manage context window
      const payloadMessages = newMessages.slice(-15);
      
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages }),
      });
      
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      const modelMessage: CaseMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: data.text,
        timestamp: Date.now(),
      };

      const finalMessages = [...newMessages, modelMessage];
      
      let updatePayload: any = {
        messages: finalMessages,
        updatedAt: serverTimestamp(),
      };

      // If this is the first message, ask the backend for a generated title
      if (caseDoc.messages.length === 0) {
        try {
          const titleRes = await fetch("/api/generate-title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: userMessage.text }),
          });
          const titleData = await titleRes.json();
          if (titleData.title) {
            updatePayload.title = titleData.title;
          }
        } catch (e) {
          console.error("Title generation failed:", e);
        }
      }

      await updateDoc(doc(db, "users", user.uid, "cases", id), {
        ...updatePayload
      });

      setCaseDoc(prev => prev ? { ...prev, messages: finalMessages, ...(updatePayload.title ? { title: updatePayload.title } : {}) } : null);
    } catch (err) {
      console.error("Chat error:", err);
      // In a real app, show error toast
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!caseDoc || !user || !id || caseDoc.messages.length === 0) return;
    setSummarizing(true);
    
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: caseDoc.messages }),
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const sumPayload: any = {
        summary: data.summary,
        tags: data.tags,
        severity: data.severity,
        resolutionSuccess: data.resolutionSuccess,
        updatedAt: serverTimestamp(),
      };
      const cleanSumPayload = Object.fromEntries(Object.entries(sumPayload).filter(([_, v]) => v !== undefined));
      await updateDoc(doc(db, "users", user.uid, "cases", id), cleanSumPayload);

      setCaseDoc(prev => prev ? { 
        ...prev, 
        summary: data.summary, 
        tags: data.tags, 
        severity: data.severity, 
        resolutionSuccess: data.resolutionSuccess 
      } : null);

    } catch (err) {
      console.error("Summarize error:", err);
    } finally {
      setSummarizing(false);
      // Scroll to the top to show the new summary
      setTimeout(() => {
        chatContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  };



  const handleSaveTitle = async () => {
    setIsEditingTitle(false);
    if (editTitleStr.trim() && editTitleStr !== caseDoc?.title && user && id) {
      await updateDoc(doc(db, "users", user.uid, "cases", id), {
        title: editTitleStr.trim(),
        updatedAt: serverTimestamp(),
      });
      setCaseDoc(prev => prev ? { ...prev, title: editTitleStr.trim() } : null);
    }
  };

  const handleResolveYes = async () => {
    if (!caseDoc || !user || !id) return;
    const newTags = Array.from(new Set([...(caseDoc.tags || []), "resolved"]));
    
    await updateDoc(doc(db, "users", user.uid, "cases", id), {
      resolutionSuccess: true,
      tags: newTags,
      updatedAt: serverTimestamp(),
    });

    setCaseDoc(prev => prev ? { ...prev, resolutionSuccess: true, tags: newTags } : null);
  };

  const handleReopenIncident = async () => {
    if (!caseDoc || !user || !id) return;
    const newTags = (caseDoc.tags || []).filter(t => t !== "resolved");
    
    await updateDoc(doc(db, "users", user.uid, "cases", id), {
      resolutionSuccess: false,
      tags: newTags,
      updatedAt: serverTimestamp(),
    });

    setCaseDoc(prev => prev ? { ...prev, resolutionSuccess: false, tags: newTags } : null);
  };

  const handleGenerateRunbook = async () => {
    if (loading || summarizing) return;
    setInput("Please generate a step-by-step remediation runbook with explicit CLI commands to resolve this incident.");
    // Small timeout to allow state to flush to UI before sending
    setTimeout(() => {
      // Create a synthetic event
      const e = { preventDefault: () => {} } as React.FormEvent;
      handleSend(e);
    }, 50);
  };






  if (!caseDoc) return <div className="p-4 text-xs font-mono text-slate-500">Loading...</div>;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0a0a0a] transition-colors duration-200">
      {/* Header */}
      <header className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-between bg-white dark:bg-[#0a0a0a] transition-colors duration-200">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(location.state?.from || "/incidents")} className="p-2 border border-zinc-300 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-700 transition-colors text-zinc-700 dark:text-zinc-400 cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            {isEditingTitle ? (
              <input 
                autoFocus 
                value={editTitleStr} 
                onChange={e => setEditTitleStr(e.target.value)} 
                onBlur={handleSaveTitle} 
                onKeyDown={e => e.key === 'Enter' && handleSaveTitle()} 
                className="bg-transparent text-zinc-900 dark:text-zinc-100 px-2 py-1 text-lg font-mono border border-zinc-300 dark:border-zinc-700 outline-none focus:border-red-500 w-96" 
              />
            ) : (
              <h1 
                onClick={() => { if (!isArchived) { setEditTitleStr(caseDoc.title); setIsEditingTitle(true); } }} 
                className="text-lg font-mono tracking-widest text-zinc-900 dark:text-zinc-100 hover:text-red-600 dark:hover:text-red-400 cursor-pointer transition-colors inline-block"
              >
                {caseDoc.title}
              </h1>
            )}
            <div className="flex items-center gap-2 mt-2">
              {caseDoc.tags?.map(t => (
                <span key={t} className="px-2 py-0.5 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-500 text-[9px] font-mono uppercase tracking-widest">{t}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleGenerateRunbook}
            disabled={isArchived || loading || summarizing || caseDoc.resolutionSuccess || caseDoc.messages.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-mono uppercase tracking-widest bg-transparent hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-zinc-300 dark:border-zinc-700 hover:border-emerald-200 dark:hover:border-emerald-900/50 text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-500 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <Server className="w-3 h-3" />
            GENERATE RUNBOOK
          </button>
          <button 
            onClick={handleSummarize}
            disabled={isArchived || summarizing || loading || caseDoc.messages.length === 0 || caseDoc.resolutionSuccess}
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-mono uppercase tracking-widest bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 text-zinc-700 dark:text-zinc-300 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {summarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            ANALYZE
          </button>


        </div>
      </header>

      {/* Main Chat Area */}
      <div id="printable-case-content" ref={chatContainerRef} className={clsx("flex-1 overflow-auto p-4 md:p-8 bg-white dark:bg-[#0a0a0a] transition-colors duration-200")}>
        <div className="max-w-4xl mx-auto space-y-6">
          {caseDoc.summary && (
            <div className="border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/10 p-6 mb-8">
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-red-600 dark:text-red-500 mb-3">SYSTEM DIAGNOSTIC SUMMARY</h3>
              <p className="text-sm text-zinc-800 dark:text-zinc-200 font-sans leading-relaxed whitespace-pre-wrap">{caseDoc.summary}</p>
            </div>
          )}

          {caseDoc.messages.length === 0 ? (
            <div className="text-center py-24 text-zinc-400 dark:text-zinc-600 font-mono text-xs uppercase tracking-widest">
              <p>[ AWAITING DIAGNOSTIC INPUT... ]</p>
            </div>
          ) : (
            caseDoc.messages.map((m) => (
              <div key={m.id} className={clsx("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
                <div className={clsx(
                  "max-w-[85%] p-5 text-sm leading-relaxed font-mono",
                  m.role === "user" 
                    ? "bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                    : "bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300"
                )}>
                  <div className="markdown-body font-mono text-sm">
                    <Markdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                        pre: ({node, ...props}) => <pre className="bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 p-3 rounded-sm overflow-x-auto my-3 text-xs border border-zinc-300 dark:border-zinc-700" {...props} />,
                        code: ({node, inline, ...props}: any) => inline ? <code className="bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded-sm text-red-600 dark:text-red-400 font-bold" {...props} /> : <code {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li {...props} />,
                        a: ({node, ...props}) => <a className="text-red-600 hover:underline" {...props} />,
                        h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-3 mt-4 text-zinc-900 dark:text-zinc-100 uppercase tracking-widest" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-md font-bold mb-2 mt-3 text-zinc-900 dark:text-zinc-100 uppercase tracking-widest" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-sm font-bold mb-2 mt-3 text-zinc-900 dark:text-zinc-100 uppercase tracking-widest" {...props} />,
                        table: ({node, ...props}) => <div className="overflow-x-auto my-3 border border-zinc-300 dark:border-zinc-700"><table className="w-full text-left border-collapse" {...props} /></div>,
                        th: ({node, ...props}) => <th className="border-b border-zinc-300 dark:border-zinc-700 p-2 bg-zinc-200 dark:bg-zinc-800 font-bold uppercase" {...props} />,
                        td: ({node, ...props}) => <td className="border-b border-zinc-200 dark:border-zinc-800 p-2" {...props} />,
                      }}
                    >
                      {m.text}
                    </Markdown>
                  </div>
                </div>
              </div>
            ))
          )}

          {!isArchived && !caseDoc.resolutionSuccess && caseDoc.messages.length > 0 && !loading && (
            <div className="flex flex-col items-center mt-8 mb-4">
              <div className="bg-white dark:bg-[#0a0a0a] transition-colors duration-200 border border-zinc-200 dark:border-zinc-800 px-6 py-4 flex flex-col md:flex-row items-center gap-6 font-mono">
                <span className="text-zinc-700 dark:text-zinc-300 text-xs uppercase tracking-widest">RESOLVE THIS INCIDENT?</span>
                <div className="flex gap-3">
                  <button onClick={handleResolveYes} className="px-5 py-2 text-[10px] bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-500 border border-red-200 dark:border-red-900 uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">YES / RESOLVE</button>
                  <button className="px-5 py-2 text-[10px] bg-transparent text-zinc-500 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-800 uppercase tracking-widest hover:bg-zinc-100 dark:bg-zinc-900 transition-colors">NO / CONTINUE</button>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-start">
              <div className="bg-transparent border border-zinc-200 dark:border-zinc-800 text-red-600 dark:text-red-500 px-5 py-4 text-xs flex items-center gap-3 font-mono uppercase tracking-widest">
                <Loader2 className="w-4 h-4 animate-spin" />
                PROCESSING LOGS...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="shrink-0 p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0a0a0a] transition-colors duration-200">
        {isArchived ? (
          <div className="max-w-4xl mx-auto flex items-center justify-between p-4 border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 font-mono text-sm">
            <span className="text-zinc-700 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              THIS INCIDENT IS ARCHIVED - READ ONLY
            </span>
          </div>
        ) : caseDoc.resolutionSuccess ? (
          <div className="max-w-4xl mx-auto flex items-center justify-between p-4 border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 font-mono text-sm">
            <span className="text-emerald-700 dark:text-emerald-500 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> INCIDENT RESOLVED - READ ONLY
            </span>
            <button 
              onClick={handleReopenIncident}
              className="px-4 py-2 text-[10px] bg-white dark:bg-[#0a0a0a] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              REOPEN INCIDENT
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex flex-col gap-3">
            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs font-mono uppercase">
                {error}
                <button type="button" onClick={() => setError(null)} className="ml-4 underline float-right">Dismiss</button>
              </div>
            )}
            <div className="relative flex items-end gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!loading && !summarizing) handleSend();
                }
              }}
              placeholder={loading || summarizing ? "SYSTEM LOCKED..." : "INPUT LOGS OR SYSTEM STATUS..."}
              disabled={loading || summarizing}
              className="w-full max-h-64 min-h-[60px] resize-none py-4 pl-14 pr-16 bg-transparent border border-zinc-200 dark:border-zinc-800 focus:border-red-500 text-zinc-900 dark:text-zinc-100 outline-none font-mono text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600 placeholder:uppercase disabled:opacity-50"
              rows={1}
            />
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              disabled={loading || summarizing}
              accept=".log,.txt,.json,.yaml,.yml,.sh,.csv" 
              className="hidden" 
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || summarizing}
              className="absolute left-2 bottom-2 p-3 bg-transparent text-zinc-400 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={!input.trim() || loading || summarizing}
              className="absolute right-2 bottom-2 p-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:border-red-500 hover:text-red-600 dark:hover:text-red-500 disabled:opacity-30 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
            </div>
          </form>
        )}
      </div>

          </div>
  );
}
