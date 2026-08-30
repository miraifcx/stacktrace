import React, { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, onSnapshot, updateDoc, doc, limit, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import { CaseDocument } from "../types";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Search, FileText, RefreshCw, ArrowLeft, MoreHorizontal, Trash2 } from "lucide-react";
import { cn, getSeverityColors, getStatusColors } from "../utils";

export function ArchivedCases() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseDocument[]>([]);
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, "users", user.uid, "cases"),
      orderBy("updatedAt", "desc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CaseDocument));
      setCases(docs);
    });

    return unsubscribe;
  }, [user]);

  const handleRestoreCase = async (e: React.MouseEvent, caseId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    setOpenMenuId(null);
    try {
      await updateDoc(doc(db, "users", user.uid, "cases", caseId), {
        archived: false,
      });
    } catch (error) {
      console.error("Failed to restore case", error);
    }
  };

  const handleDeleteCase = async (e: React.MouseEvent, caseId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    setOpenMenuId(null);
    try {
      await deleteDoc(doc(db, "users", user.uid, "cases", caseId));
    } catch (error) {
      console.error("Failed to delete case", error);
    }
  };

  const handleMenuClick = (e: React.MouseEvent, caseId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(prev => prev === caseId ? null : caseId);
  };

  const filteredCases = cases.filter(c => 
    c.archived && (
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.tags?.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
    c.summary?.toLowerCase().includes(search.toLowerCase())
  ));

  return (
    <div className="flex-1 overflow-auto bg-zinc-50 dark:bg-[#0a0a0a] p-6 lg:p-12 transition-colors duration-200">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex items-end justify-between mb-12">
          <div>
            <h1 className="text-4xl font-mono text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-4 leading-tight">Archived Cases</h1>
          </div>
          <div className="flex gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-500 px-4 py-3 font-mono text-[10px] uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              BACK TO DASHBOARD
            </Link>
          </div>
        </header>

        <div className="relative border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0a0a0a] mb-6 transition-colors duration-200">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-600" />
          <input
            type="text"
            placeholder="Search archived conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-transparent text-sm text-zinc-900 dark:text-zinc-300 focus:outline-none focus:border-red-500 transition-colors placeholder:text-zinc-400 dark:placeholder:text-zinc-600 font-mono uppercase tracking-widest"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
          {filteredCases.map(c => (
            <div
              key={c.id}
              onClick={() => navigate(`/case/${c.id}`, { state: { from: '/archived' } })}
              className="group cursor-pointer block bg-white dark:bg-[#0a0a0a] border-b border-r border-zinc-200 dark:border-zinc-800 p-8 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all flex flex-col h-full opacity-70 hover:opacity-100"
            >
              <div className="flex items-center justify-between mb-6">
                  <h3 className={cn("px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest border", getSeverityColors(c.severity || "UNRATED"))}>
                    {c.severity || "UNRATED"} PRIORITY
                  </h3>
                {c.resolutionSuccess !== undefined && (
                  <span className={cn("px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest border", getStatusColors(c.resolutionSuccess))}>
                    {c.resolutionSuccess ? 'RESOLVED' : 'ACTIVE'}
                  </span>
                )}
              </div>
              
              <div className="text-xl font-mono text-zinc-900 dark:text-zinc-100 mb-4 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors line-clamp-2">
                {c.title}
              </div>
              {c.summary ? (
                <p className="text-sm font-sans text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed mb-6 flex-1">
                  {c.summary}
                </p>
              ) : (
                <p className="text-sm font-mono text-zinc-400 dark:text-zinc-600 italic mb-6 flex-1">No summary generated.</p>
              )}
              <div className="mt-auto flex items-end justify-between">
                <div>
                  <div className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600 uppercase tracking-widest mb-4">
                    {c.updatedAt ? format(typeof (c.updatedAt as any).toDate === 'function' ? (c.updatedAt as any).toDate() : new Date(c.updatedAt as any), "MMM d, yyyy") : 'NOW'}
                  </div>
                  {c.tags && c.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {c.tags.slice(0,3).map(tag => (
                        <span key={tag} className="px-2 py-1 bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-[9px] font-mono uppercase tracking-widest">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button
                    onClick={(e) => handleMenuClick(e, c.id!)}
                    className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent transition-colors"
                    aria-label="Options"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {openMenuId === c.id && (
                    <div className="absolute right-0 bottom-full mb-2 w-36 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl z-10 font-mono text-[10px] uppercase tracking-widest flex flex-col">
                      <button
                        onClick={(e) => handleRestoreCase(e, c.id!)}
                        className="flex items-center gap-2 w-full text-left px-4 py-3 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" /> Restore
                      </button>
                      <button
                        onClick={(e) => handleDeleteCase(e, c.id!)}
                        className="flex items-center gap-2 w-full text-left px-4 py-3 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-zinc-100 dark:border-zinc-800"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filteredCases.length === 0 && (
            <div className="col-span-full text-center py-20 bg-white dark:bg-[#0a0a0a] border-b border-r border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
              <FileText className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
              <h3 className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">No Archived Records</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
