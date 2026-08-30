import React, { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, limit } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import { CaseDocument } from "../types";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Plus, Search, FileText, Archive as ArchiveIcon, Database, Server, Cpu, ShieldAlert, ArrowRight, Network, ChevronDown, ChevronUp, GitMerge, Lock, HardDrive, Cloud, AlertTriangle, Monitor, Users, Activity, Clock } from "lucide-react";
import { cn, getSeverityColors, getStatusColors } from "../utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export function Incidents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseDocument[]>([]);
  const [search, setSearch] = useState("");
  const [showScenarios, setShowScenarios] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, "users", user.uid, "cases"),
      orderBy("updatedAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CaseDocument));
      setCases(docs);
    });

    return unsubscribe;
  }, [user]);

  const handleNewCase = async () => {
    if (!user) return;
    
    const docRef = await addDoc(collection(db, "users", user.uid, "cases"), {
      userId: user.uid,
      title: "New Diagnostic Case",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      messages: [],
    });
    
    navigate(`/case/${docRef.id}`);
  };

  const handleSeedScenario = async (scenario: any) => {
    if (!user) return;
    
    const docRef = await addDoc(collection(db, "users", user.uid, "cases"), {
      userId: user.uid,
      title: scenario.title,
      resolutionSuccess: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      messages: scenario.messages,
    });
    
    navigate(`/case/${docRef.id}`);
  };

  const SCENARIOS = [
    {
      label: "DevOps / CI/CD",
      title: "GitHub Actions Pipeline Failure",
      icon: <GitMerge className="w-4 h-4 text-zinc-500" />,
      payload: {
        title: "GitHub Actions Pipeline Failure",
        summary: "Build failing on npm install due to upstream registry timeout.",
        severity: "high",
        tags: ["devops", "cicd", "github"],
        messages: [{ id: "m1", role: "user", text: "Our production deployment pipeline is blocked. The 'npm install' step in GitHub Actions keeps timing out after 15 minutes.", timestamp: Date.now() }]
      }
    },
    {
      label: "System Admin",
      title: "SSL Certificate Expiry on Core API",
      icon: <Lock className="w-4 h-4 text-zinc-500" />,
      payload: {
        title: "SSL Certificate Expiry on Core API",
        summary: "Internal services failing with SEC_ERROR_EXPIRED_CERTIFICATE.",
        severity: "critical",
        tags: ["ssl", "security", "outage"],
        messages: [{ id: "m1", role: "user", text: "Alert: All clients are getting SEC_ERROR_EXPIRED_CERTIFICATE when hitting the core API. Did our automated cert renewal fail?", timestamp: Date.now() }]
      }
    },
    {
      label: "Cloud Eng",
      title: "S3 Bucket Public Access Alert",
      icon: <Cloud className="w-4 h-4 text-zinc-500" />,
      payload: {
        title: "S3 Bucket Public Access Alert",
        summary: "AWS GuardDuty flagged a sensitive bucket opened to public read.",
        severity: "critical",
        tags: ["aws", "security", "s3"],
        messages: [{ id: "m1", role: "user", text: "Security hub just fired a P1. The 'prod-customer-backups' S3 bucket was modified to allow public read access. We need to lock this down and audit access logs.", timestamp: Date.now() }]
      }
    },
    {
      label: "Helpdesk",
      title: "Active Directory Account Lockout",
      icon: <Users className="w-4 h-4 text-zinc-500" />,
      payload: {
        title: "Active Directory Account Lockout",
        summary: "User repeatedly locked out after password reset.",
        severity: "low",
        tags: ["activedirectory", "helpdesk", "auth"],
        messages: [{ id: "m1", role: "user", text: "A user from marketing keeps getting locked out of their AD account 5 minutes after I reset their password. Could it be a stale credential on their phone?", timestamp: Date.now() }]
      }
    },
    {
      label: "DevOps / K8s",
      title: "ArgoCD Sync Out of Memory",
      icon: <Server className="w-4 h-4 text-zinc-500" />,
      payload: {
        title: "ArgoCD Sync Out of Memory",
        summary: "ArgoCD controller crashing during large monorepo sync.",
        severity: "high",
        tags: ["kubernetes", "argocd", "memory"],
        messages: [{ id: "m1", role: "user", text: "ArgoCD is crash looping with OOMKilled when trying to sync our main infrastructure repository.", timestamp: Date.now() }]
      }
    },
    {
      label: "System Admin",
      title: "Root Partition 100% Full",
      icon: <HardDrive className="w-4 h-4 text-zinc-500" />,
      payload: {
        title: "Root Partition 100% Full",
        summary: "Production database server out of disk space on /.",
        severity: "critical",
        tags: ["linux", "storage", "outage"],
        messages: [{ id: "m1", role: "user", text: "The primary MySQL server just went down. SSH is sluggish and df -h shows / is at 100% utilization.", timestamp: Date.now() }]
      }
    },
    {
      label: "Cloud Eng",
      title: "Lambda Cold Start Spikes",
      icon: <Cpu className="w-4 h-4 text-zinc-500" />,
      payload: {
        title: "Lambda Cold Start Spikes",
        summary: "API Gateway returning 504 timeouts due to Lambda init delays.",
        severity: "medium",
        tags: ["serverless", "aws", "performance"],
        messages: [{ id: "m1", role: "user", text: "We're seeing intermittent 504 Gateway Timeouts. CloudWatch metrics show our Java Lambda functions are taking over 10 seconds to cold start.", timestamp: Date.now() }]
      }
    },
    {
      label: "Helpdesk",
      title: "BSOD INACCESSIBLE_BOOT_DEVICE",
      icon: <Monitor className="w-4 h-4 text-zinc-500" />,
      payload: {
        title: "BSOD INACCESSIBLE_BOOT_DEVICE",
        summary: "CEO laptop blue screening after Windows Update.",
        severity: "critical",
        tags: ["windows", "hardware", "helpdesk"],
        messages: [{ id: "m1", role: "user", text: "The CEO's laptop just installed a Windows update and is now stuck in a boot loop showing INACCESSIBLE_BOOT_DEVICE.", timestamp: Date.now() }]
      }
    }
  ];

  const handleArchiveCase = async (e: React.MouseEvent, caseId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "cases", caseId), {
        archived: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to archive case", error);
    }
  };

  const filteredCases = cases.filter(c => 
    !c.archived && (
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.tags?.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
    c.summary?.toLowerCase().includes(search.toLowerCase())
  ));


  return (
    <div className="flex-1 overflow-auto bg-zinc-50 dark:bg-[#0a0a0a] p-6 lg:p-12 transition-colors duration-200">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex items-end justify-between mb-12">
          <div>
            <h1 className="text-4xl font-mono text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-4 leading-tight">Incidents</h1>
          </div>
          <div className="flex gap-4">
            <Link
              to="/archived"
              className="flex items-center gap-2 bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 px-4 py-3 font-mono text-[10px] uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <ArchiveIcon className="w-3 h-3" />
              ARCHIVED CASES
            </Link>
            <button
              onClick={handleNewCase}
              className="flex items-center gap-3 bg-transparent border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 px-6 py-3 font-mono text-[10px] uppercase tracking-widest hover:border-zinc-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              CREATE NEW CASE
            </button>
          </div>
        </header>

        <div className="relative border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0a0a0a] mb-6 transition-colors duration-200">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-600" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-red-500 transition-colors placeholder:text-zinc-400 dark:placeholder:text-zinc-600 font-mono uppercase tracking-widest"
          />
        </div>

        <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0a0a0a] mb-8 transition-colors duration-200">
          <button 
            onClick={() => setShowScenarios(!showScenarios)}
            className="w-full flex flex-col md:flex-row items-start md:items-center justify-between p-6 gap-4 hover:bg-zinc-50 dark:hover:bg-[#121212] transition-colors"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-mono text-zinc-900 dark:text-zinc-100 uppercase tracking-widest font-bold">Sample Scenarios</h2>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Seed Firestore and Test Gemini with these scenarios</span>
              {showScenarios ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </div>
          </button>
          
          {showScenarios && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 pt-0">
              {SCENARIOS.map((s, i) => (
                <button 
                  key={i}
                  onClick={() => handleSeedScenario(s.payload)}
                  className="text-left group flex flex-col p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{s.label}</span>
                    <span className={cn("text-[10px] font-mono uppercase tracking-widest", s.payload.severity === 'critical' ? 'text-purple-500' : s.payload.severity === 'high' ? 'text-red-500' : s.payload.severity === 'medium' ? 'text-amber-500' : 'text-emerald-500')}>
                      {s.payload.severity}
                    </span>
                  </div>
                  <span className="text-xs font-sans font-medium text-zinc-800 dark:text-zinc-200 leading-tight">{s.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
          {filteredCases.map(c => (
            <div
              key={c.id}
              onClick={() => navigate(`/case/${c.id}`)}
              className="group cursor-pointer block bg-white dark:bg-[#0a0a0a] border-b border-r border-zinc-200 dark:border-zinc-800 p-8 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all flex flex-col h-full"
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
                <button
                  onClick={(e) => handleArchiveCase(e, c.id!)}
                  className="p-2 text-zinc-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-transparent hover:border-amber-200 dark:hover:border-amber-900/50 transition-colors"
                  aria-label="Archive Case"
                >
                  <ArchiveIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {filteredCases.length === 0 && (
            <div className="col-span-full text-center py-20 bg-white dark:bg-[#0a0a0a] border-b border-r border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
              <FileText className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
              <h3 className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">No Records Found</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
