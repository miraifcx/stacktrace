import { useState, useEffect, useMemo } from "react";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import { CaseDocument } from "../types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line } from "recharts";
import { Activity, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

export function Analytics() {
  const { user } = useAuth();
  const [cases, setCases] = useState<CaseDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchCases = async () => {
      const q = query(collection(db, "users", user.uid, "cases"));
      const snapshot = await getDocs(q);
      setCases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CaseDocument)));
      setLoading(false);
    };
    fetchCases();
  }, [user]);

  const stats = useMemo(() => {
    const active = cases.filter(c => !c.archived && !c.resolutionSuccess).length;
    const resolved = cases.filter(c => c.resolutionSuccess).length;
    const critical = cases.filter(c => !c.archived && c.severity?.toLowerCase() === 'critical').length;
    
    const severityCount = { low: 0, medium: 0, high: 0, critical: 0 };
    const tagCount: Record<string, number> = {};
    const timelineCount: Record<string, number> = {};
    let totalTtrHours = 0;
    let ttrCount = 0;

    cases.forEach(c => {
      if (!c.archived) {
        if (c.severity) {
          const s = c.severity.toLowerCase();
          if (s in severityCount) severityCount[s as keyof typeof severityCount]++;
        }
        
        if (c.tags) {
          c.tags.forEach(t => {
            const tag = t.toLowerCase();
            if (tag !== 'resolved') tagCount[tag] = (tagCount[tag] || 0) + 1;
          });
        }

        const dateObj = new Date(typeof c.createdAt === 'number' ? c.createdAt : (c.createdAt as any)?.toMillis?.() || Date.now());
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        timelineCount[dateStr] = (timelineCount[dateStr] || 0) + 1;

        if (c.resolutionSuccess && c.updatedAt && c.createdAt) {
          const updated = typeof c.updatedAt === 'number' ? c.updatedAt : (c.updatedAt as any).toMillis?.() || Date.now();
          const created = typeof c.createdAt === 'number' ? c.createdAt : (c.createdAt as any).toMillis?.() || Date.now();
          const diffHours = (updated - created) / (1000 * 60 * 60);
          if (diffHours >= 0) {
            totalTtrHours += diffHours;
            ttrCount++;
          }
        }
      }
    });

    const avgTtr = ttrCount > 0 ? (totalTtrHours / ttrCount).toFixed(1) : "0";

    const pieData = [
      { name: 'Low', value: severityCount.low, color: '#10b981' },
      { name: 'Medium', value: severityCount.medium, color: '#f59e0b' },
      { name: 'High', value: severityCount.high, color: '#ef4444' },
      { name: 'Critical', value: severityCount.critical, color: '#a855f7' }
    ].filter(d => d.value > 0);

    const tagData = Object.entries(tagCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const timelineData = Object.entries(timelineCount)
      .map(([date, count]) => ({ date, count }))
      .slice(-7);

    return { active, resolved, critical, avgTtr, pieData, tagData, timelineData };
  }, [cases]);

  if (loading) return <div className="p-4 text-xs font-mono text-slate-500">Loading dashboard...</div>;

  return (
    <div className="flex-1 overflow-auto bg-zinc-50 dark:bg-[#0a0a0a] p-6 lg:p-12 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 max-w-2xl">
          <h1 className="text-4xl font-mono text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-4 leading-tight">Dashboard</h1>
          <p className="text-sm font-sans text-zinc-600 dark:text-zinc-300 leading-relaxed">
            System overview and real-time incident metrics.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col justify-between h-40">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Active Incidents</span>
              <Activity className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-5xl font-mono text-zinc-900 dark:text-zinc-100">{stats.active}</div>
          </div>
          
          <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col justify-between h-40">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Critical Alerts</span>
              <AlertTriangle className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-5xl font-mono text-zinc-900 dark:text-zinc-100">{stats.critical}</div>
          </div>

          <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col justify-between h-40">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Total Resolved</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-5xl font-mono text-zinc-900 dark:text-zinc-100">{stats.resolved}</div>
          </div>

          <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col justify-between h-40">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Avg MTTR (Hours)</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-5xl font-mono text-zinc-900 dark:text-zinc-100">{stats.avgTtr}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 p-6 h-72 flex flex-col">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Severity Breakdown</div>
            <div className="flex-1 w-full min-h-0 relative">
              {stats.pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {stats.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', fontSize: '12px', color: '#fff', borderRadius: '4px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-zinc-500">NO DATA</div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 p-6 h-72 flex flex-col">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Top Issue Nodes</div>
            <div className="flex-1 w-full min-h-0 relative">
              {stats.tagData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.tagData} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'monospace' }} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(113,113,122,0.1)' }}
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', fontSize: '12px', color: '#fff', borderRadius: '4px' }}
                    />
                    <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-zinc-500">NO DATA</div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 p-6 h-72 flex flex-col">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Incident Velocity (7 Days)</div>
          <div className="flex-1 w-full min-h-0 relative">
              {stats.timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'monospace' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'monospace' }} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', fontSize: '12px', color: '#fff', borderRadius: '4px' }}
                    />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-zinc-500">NO DATA</div>
              )}
          </div>
        </div>

      </div>
    </div>
  );
}
