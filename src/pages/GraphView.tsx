import { useTheme } from "../ThemeContext";
import { useState, useEffect, useMemo } from "react";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import { CaseDocument } from "../types";
import ForceGraph2D from "react-force-graph-2d";
import { useNavigate } from "react-router-dom";
import { Filter } from "lucide-react";


export function GraphView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseDocument[]>([]);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [timeframeFilter, setTimeframeFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    const fetchCases = async () => {
      const q = query(collection(db, "users", user.uid, "cases"));
      const snapshot = await getDocs(q);
      setCases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CaseDocument)));
    };
    fetchCases();
  }, [user]);

  useEffect(() => {
    const handleResize = () => {
      const container = document.getElementById("graph-container");
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: container.clientHeight
        });
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      if (c.archived) return false;
      if (statusFilter === "active" && c.resolutionSuccess) return false;
      if (statusFilter === "resolved" && !c.resolutionSuccess) return false;
      if (severityFilter !== "all" && c.severity?.toLowerCase() !== severityFilter) return false;
      
      if (timeframeFilter !== "all") {
        const now = Date.now();
        // Handle both number and Firestore Timestamp formats
        const getMillis = (val: any) => {
          if (!val) return now;
          if (typeof val === 'number') return val;
          if (typeof val.toMillis === 'function') return val.toMillis();
          if (val.seconds) return val.seconds * 1000;
          return now;
        };
        const caseTime = c.updatedAt ? getMillis(c.updatedAt) : getMillis(c.createdAt);
        const hoursDiff = (now - caseTime) / (1000 * 60 * 60);
        
        if (timeframeFilter === "24h" && hoursDiff > 24) return false;
        if (timeframeFilter === "7d" && hoursDiff > 24 * 7) return false;
        if (timeframeFilter === "30d" && hoursDiff > 24 * 30) return false;
      }
      return true;
    });
  }, [cases, statusFilter, severityFilter, timeframeFilter]);

  const { graphData, tagColorMap } = useMemo(() => {
    const nodes: any[] = [];
    const links: any[] = [];
    
    const getMeaningfulTags = (tags?: string[]) => {
      if (!tags) return [];
      return tags.filter(t => t.toLowerCase() !== 'resolved');
    };

    const mainTagsSet = new Set<string>();
    filteredCases.forEach(c => {
      const meaningfulTags = getMeaningfulTags(c.tags);
      if (meaningfulTags.length > 0) {
        mainTagsSet.add(meaningfulTags[0]);
      }
    });

    const uniqueMainTags = Array.from(mainTagsSet).sort();
    
    const tagColors: Record<string, string> = {};
    const TAG_PALETTE = [
      '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', 
      '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', 
      '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
    ];
    uniqueMainTags.forEach((tag, index) => {
      tagColors[tag] = TAG_PALETTE[index % TAG_PALETTE.length];
    });

    filteredCases.forEach(c => {
      const meaningfulTags = getMeaningfulTags(c.tags);
      const primaryColor = meaningfulTags.length > 0 ? tagColors[meaningfulTags[0]] : "#71717a";
      nodes.push({ 
        id: c.id, 
        name: c.title, 
        type: "case", 
        val: 3, 
        severity: c.severity,
        color: primaryColor,
      });
    });

    for (let i = 0; i < filteredCases.length; i++) {
      for (let j = i + 1; j < filteredCases.length; j++) {
        const c1 = filteredCases[i];
        const c2 = filteredCases[j];
        
        const tags1 = getMeaningfulTags(c1.tags);
        const tags2 = getMeaningfulTags(c2.tags);
        
        if (tags1.length > 0 && tags2.length > 0) {
          const primary1 = tags1[0];
          const primary2 = tags2[0];
          
          if (primary1 === primary2) {
            links.push({ source: c1.id, target: c2.id, shared: [primary1] });
          }
        }
      }
    }

    return { graphData: { nodes, links }, tagColorMap: tagColors };
  }, [filteredCases]);

  const { theme } = useTheme();

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-[#0a0a0a] p-6 lg:p-12 transition-colors duration-200">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-mono text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-4 leading-tight">Network Topology</h1>
          <p className="text-sm font-sans text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Visualize relationships between your cases based on relevancy.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="flex items-center gap-2 mr-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Filters</span>
          </div>
          
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-mono uppercase tracking-widest px-3 py-2 outline-none focus:border-red-500 transition-colors cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="resolved">Resolved Only</option>
          </select>

          <select 
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-mono uppercase tracking-widest px-3 py-2 outline-none focus:border-red-500 transition-colors cursor-pointer"
          >
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select 
            value={timeframeFilter}
            onChange={e => setTimeframeFilter(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-mono uppercase tracking-widest px-3 py-2 outline-none focus:border-red-500 transition-colors cursor-pointer"
          >
            <option value="all">All Time</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </header>
      
      <div id="graph-container" className="flex-1 w-full h-full relative border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0a0a0a] transition-colors duration-200">
        {cases.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-400 dark:text-zinc-600 font-mono text-xs uppercase tracking-widest">
            {"> NO_NODES_FOUND"}
          </div>
        ) : (
          <>
            <ForceGraph2D
              width={dimensions.width}
              height={dimensions.height}
              graphData={graphData}
              nodeLabel="name"
              nodeColor={node => node.color}
              nodeRelSize={4}
              linkColor={() => theme === 'dark' ? "#27272a" : "#e4e4e7"}
              backgroundColor={theme === 'dark' ? "#0a0a0a" : "#ffffff"}
              onNodeClick={(node) => {
                if (node.type === "case") navigate(`/case/${node.id}`);
              }}
            />
            {Object.keys(tagColorMap).length > 0 && (
              <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 p-4 shadow-lg pointer-events-none min-w-[150px]">
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-zinc-900 dark:text-zinc-100 mb-3 border-b border-zinc-200 dark:border-zinc-800 pb-2">Topic Legend</h3>
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-2 pointer-events-auto">
                  {Object.entries(tagColorMap).map(([tag, color]) => (
                    <div key={tag} className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                      <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">{tag}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
