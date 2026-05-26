
import React, { useEffect, useState, useMemo } from 'react';
import { Task, TimerSession, Client, ActiveTimer, Project } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock, CheckCircle2, TrendingUp, Target, Activity, AlertTriangle, AlertCircle, BarChart3, Users, UserCheck } from 'lucide-react';

interface DashboardProps {
  tasks: Task[];
  clients: Client[];
  projects?: Project[];
  sessions: TimerSession[];
  activeTimer: ActiveTimer | null;
  onStartTimer?: (taskId?: string, subtaskId?: string) => void;
  children?: React.ReactNode;
}

const Dashboard: React.FC<DashboardProps> = ({ tasks, clients, projects = [], sessions, activeTimer, children }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Constants
  const DAILY_GOAL_HOURS = 7.6; // 7h 36m
  const DAILY_GOAL_SECONDS = DAILY_GOAL_HOURS * 3600;

  // Stats Calculation
  const totalSecondsTasks = tasks.reduce((acc, t) => acc + t.totalTime, 0); 
  const totalSecondsQuick = sessions
    .filter(s => !s.taskId && s.endTime)
    .reduce((acc, s) => acc + (s.endTime! - s.startTime) / 1000, 0);

  const totalSeconds = totalSecondsTasks + totalSecondsQuick;
  const activeDuration = activeTimer ? Math.floor((now - activeTimer.startTime) / 1000) : 0;
  const validActiveDuration = Math.max(0, activeDuration);
  const displayTotalSeconds = totalSeconds + validActiveDuration;
  const totalHours = (displayTotalSeconds / 3600).toFixed(1);
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const activeExternalClientsCount = clients.filter(c => !c.isInternal).length;
  
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  
  const todaySecondsCompleted = sessions.reduce((acc, session) => {
    if (session.startTime >= startOfToday.getTime()) {
      const end = session.endTime || now;
      return acc + ((end - session.startTime) / 1000);
    }
    return acc;
  }, 0);

  const activeSecondsToday = (activeTimer && activeTimer.startTime >= startOfToday.getTime()) 
    ? validActiveDuration 
    : 0;

  const totalTodaySeconds = todaySecondsCompleted + activeSecondsToday;
  const todayProgressPercent = Math.min((totalTodaySeconds / DAILY_GOAL_SECONDS) * 100, 100);
  const remainingSeconds = Math.max(DAILY_GOAL_SECONDS - totalTodaySeconds, 0);

  const chartData = useMemo(() => {
    const data: any[] = [];
    let internalHours = 0;

    clients.forEach(client => {
      const clientTasks = tasks.filter(t => t.clientId === client.id);
      const taskSeconds = clientTasks.reduce((acc, t) => acc + t.totalTime, 0);
      const quickSessions = sessions.filter(s => !s.taskId && s.clientId === client.id && s.endTime);
      const quickSeconds = quickSessions.reduce((acc, s) => acc + (s.endTime! - s.startTime) / 1000, 0);

      let additional = 0;
      if (activeTimer) {
         const activeTask = tasks.find(t => t.id === activeTimer.taskId);
         if (activeTask && activeTask.clientId === client.id) {
           additional = validActiveDuration;
         }
      }

      const totalH = parseFloat(((taskSeconds + quickSeconds + additional) / 3600).toFixed(2));

      if (client.isInternal) {
        internalHours += totalH;
      } else {
        if (totalH > 0) {
            data.push({ name: client.name, hours: totalH, color: client.color });
        }
      }
    });

    if (internalHours > 0) {
      data.push({ name: 'Internal Work', hours: parseFloat(internalHours.toFixed(2)), color: '#94a3b8' });
    }
    
    const unassignedQuickSeconds = sessions
        .filter(s => !s.taskId && !s.clientId && s.endTime)
        .reduce((acc, s) => acc + (s.endTime! - s.startTime) / 1000, 0);

    if (unassignedQuickSeconds > 0) {
        data.push({
            name: 'Unassigned',
            hours: parseFloat((unassignedQuickSeconds / 3600).toFixed(2)),
            color: '#10b981'
        });
    }

    return data;
  }, [clients, tasks, sessions, activeTimer, validActiveDuration]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const [insightsClientId, setInsightsClientId] = useState('');

  // ── Client Insights Data ──
  const insightsData = useMemo(() => {
    const relevantTasks = insightsClientId
      ? tasks.filter(t => t.clientId === insightsClientId)
      : tasks.filter(t => clients.find(c => c.id === t.clientId && !c.isInternal));

    const relevantClientIds = insightsClientId
      ? [insightsClientId]
      : clients.filter(c => !c.isInternal).map(c => c.id);

    const relevantSessions = sessions.filter(s =>
      s.endTime && (s.clientId && relevantClientIds.includes(s.clientId)) ||
      (s.taskId && relevantTasks.find(t => t.id === s.taskId))
    );

    // Top Tasks
    const taskTimeMap = new Map<string, number>();
    relevantSessions.forEach(s => {
      const tId = s.taskId;
      if (tId) {
        const dur = (s.endTime! - s.startTime) / 1000;
        taskTimeMap.set(tId, (taskTimeMap.get(tId) || 0) + dur);
      }
    });
    const topTasks = Array.from(taskTimeMap.entries())
      .map(([taskId, seconds]) => ({
        taskId,
        title: tasks.find(t => t.id === taskId)?.title || 'Unknown',
        seconds
      }))
      .sort((a, b) => b.seconds - a.seconds);

    // Keyword Distribution
    const STOP_WORDS = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
      'it', 'its', 'this', 'that', 'these', 'those', 'not', 'no', 'also',
      'has', 'had', 'have', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'can', 'just', 'need', 'needs', 'like',
    ]);
    const wordTimeMap = new Map<string, number>();
    relevantSessions.forEach(s => {
      if (!s.notes) return;
      const plainText = stripHtml(s.notes).toLowerCase();
      const words = plainText.split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !STOP_WORDS.has(w));
      const dur = (s.endTime! - s.startTime) / 1000;
      words.forEach(w => {
        wordTimeMap.set(w, (wordTimeMap.get(w) || 0) + dur);
      });
    });
    const maxKeywordSec = Math.max(...Array.from(wordTimeMap.values()), 1);
    const keywords = Array.from(wordTimeMap.entries())
      .map(([word, seconds]) => ({ word, seconds, pct: (seconds / maxKeywordSec) * 100 }))
      .sort((a, b) => b.seconds - a.seconds);

    // Micro-tasking Warning
    const clientSessionCounts = relevantSessions.length;
    const totalClientMinutes = relevantSessions.reduce((acc, s) => acc + ((s.endTime! - s.startTime) / 60000), 0);
    const avgMinutes = clientSessionCounts > 0 ? totalClientMinutes / clientSessionCounts : 0;
    const microTasking = {
      active: clientSessionCounts > 5 && avgMinutes < 15,
      count: clientSessionCounts,
      avgMinutes
    };

    // Runaway Tasks (>10h in-progress)
    const runawayTasks = relevantTasks.filter(t =>
      t.status === 'in-progress' && t.totalTime > 36000
    );

    // Active Risks (High/Medium on active projects)
    const relevantProjects = insightsClientId
      ? projects.filter(p => p.clientId === insightsClientId && (p.status === 'active' || p.status === 'planning'))
      : projects.filter(p => relevantClientIds.includes(p.clientId) && (p.status === 'active' || p.status === 'planning'));
    const activeRisks = relevantProjects.reduce((acc, p) =>
      acc + p.risks.filter(r => r.impact === 'High' || r.impact === 'Medium').length, 0
    );

    // Stuck Tasks (>5h, todo/in-progress, created >14 days ago)
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const stuckTasks = relevantTasks.filter(t =>
      (t.status === 'todo' || t.status === 'in-progress') &&
      t.totalTime > 18000 &&
      t.createdAt < fourteenDaysAgo
    );

    return { topTasks, keywords, microTasking, runawayTasks, activeRisks, stuckTasks };
  }, [tasks, sessions, clients, projects, insightsClientId, stripHtml]);

  const StatCard = ({ title, value, icon: Icon, bgColor, textColor, subtext }: { title: string, value: string | number, icon: any, bgColor: string, textColor: string, subtext?: string }) => (
    <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl flex items-start justify-between">
      <div>
        <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-white">{value}</h3>
        {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-lg ${bgColor}`}>
        <Icon size={24} className={textColor} />
      </div>
    </div>
  );

  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Dashboard</h2>
        <p className="text-slate-400 text-sm">Track your daily progress towards the 7.6h goal.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
             <div>
                <p className="text-slate-400 text-sm font-medium mb-1">Daily Goal (7.6h)</p>
                <h3 className="text-3xl font-bold text-white">{formatDuration(totalTodaySeconds)}</h3>
             </div>
             <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Target size={24} />
             </div>
          </div>
          <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-1000"
              style={{ width: `${todayProgressPercent}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2 text-right">{formatDuration(remainingSeconds)} remaining</p>
        </div>

        <StatCard title="Total Tracked" value={`${totalHours}h`} icon={Clock} bgColor="bg-blue-500/20" textColor="text-blue-400" subtext="Lifetime total" />
        <StatCard title="Completed Tasks" value={completedTasks} icon={CheckCircle2} bgColor="bg-indigo-500/20" textColor="text-indigo-400" />
        <StatCard title="Active Clients" value={activeExternalClientsCount} icon={TrendingUp} bgColor="bg-purple-500/20" textColor="text-purple-400" subtext="External only" />
      </div>

      {children}

      <div className="grid lg:grid-cols-3 gap-8 h-full">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 h-96">
            <h3 className="text-lg font-semibold text-white mb-6">Time Distribution by Client</h3>
            <div className="h-full pb-8">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} angle={-45} textAnchor="end" interval={0} height={80} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}h`} />
                  <Tooltip 
                    cursor={{fill: '#334155', opacity: 0.4}}
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                    itemStyle={{ color: '#cbd5e1' }}
                  />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 h-fit">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Activity size={20} className="text-indigo-400" />
            Recent Activity
          </h3>
          <div className="space-y-4">
            {sessions.slice().reverse().slice(0, 8).map(session => {
              const task = session.taskId ? tasks.find(t => t.id === session.taskId) : null;
              const duration = session.endTime ? ((session.endTime - session.startTime) / 1000) : 0;
              const isToday = session.startTime >= startOfToday.getTime();

              return (
                <div key={session.id} className="flex items-center gap-3 pb-3 border-b border-slate-700/50 last:border-0 last:pb-0">
                  <div className={`w-2 h-2 rounded-full mt-1 ${isToday ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{task ? task.title : (session.customTitle || 'Quick Log')}</p>
                    <p className="text-xs text-slate-500 flex justify-between">
                      <span>{isToday ? 'Today' : new Date(session.startTime).toLocaleDateString()}</span>
                      {session.notes && <span className="truncate max-w-[100px] ml-2 text-slate-600 italic">{stripHtml(session.notes)}</span>}
                    </p>
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    {session.endTime ? `${Math.round(duration / 60)}m` : 'Active'}
                  </div>
                </div>
              );
            })}
            {sessions.length === 0 && <p className="text-slate-500 text-sm">No recent activity recorded.</p>}
          </div>
        </div>
</div>

      {/* ── Client Insights & Pain Points ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <BarChart3 size={20} className="text-indigo-400" />
            Client Insights & Pain Points
          </h3>
          <select
            value={insightsClientId}
            onChange={(e) => setInsightsClientId(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">All Clients</option>
            {clients.filter(c => !c.isInternal).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {insightsData && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Top Tasks */}
            <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-700/50">
              <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-400" />
                Most Time-Consuming Tasks
              </h4>
              <div className="space-y-2">
                {insightsData.topTasks.length === 0 && (
                  <p className="text-slate-500 text-sm">No tracked tasks for this client.</p>
                )}
                {insightsData.topTasks.slice(0, 5).map((item, i) => (
                  <div key={item.taskId} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300 truncate flex-1">
                      <span className="text-slate-500 mr-2 font-mono text-xs">{i + 1}.</span>
                      {item.title}
                    </span>
                    <span className="text-white font-mono text-xs ml-3 shrink-0">{formatDuration(item.seconds)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Keyword Distribution */}
            <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-700/50">
              <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Activity size={16} className="text-emerald-400" />
                Notes Keyword Distribution
              </h4>
              <div className="space-y-2">
                {insightsData.keywords.length === 0 && (
                  <p className="text-slate-500 text-sm">No session notes to analyze for this client.</p>
                )}
                {insightsData.keywords.slice(0, 8).map((kw) => (
                  <div key={kw.word} className="flex items-center gap-3">
                    <div className="flex-1 h-5 bg-slate-800 rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-indigo-500/60 rounded-full transition-all"
                        style={{ width: `${Math.min(kw.pct, 100)}%` }}
                      />
                      <span className="absolute inset-0 flex items-center px-2 text-xs text-slate-200 truncate">
                        {kw.word}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-slate-400 shrink-0 w-12 text-right">
                      {formatDuration(kw.seconds)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pain Points */}
            <div className="lg:col-span-2 bg-slate-900/30 rounded-lg p-4 border border-slate-700/50">
              <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-400" />
                Pain Points & Warnings
              </h4>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Micro-tasking */}
                <div className={`rounded-lg p-3 border ${insightsData.microTasking.active ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/50 border-slate-700/30'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle size={14} className={insightsData.microTasking.active ? 'text-amber-400' : 'text-slate-500'} />
                    <span className={`text-xs font-bold uppercase ${insightsData.microTasking.active ? 'text-amber-300' : 'text-slate-500'}`}>
                      Micro-tasking
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {insightsData.microTasking.active
                      ? `${insightsData.microTasking.count} sessions avg ${Math.round(insightsData.microTasking.avgMinutes)}m — high context switching`
                      : 'No excessive context switching detected'}
                  </p>
                </div>

                {/* Runaway Tasks */}
                <div className={`rounded-lg p-3 border ${insightsData.runawayTasks.length > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800/50 border-slate-700/30'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={14} className={insightsData.runawayTasks.length > 0 ? 'text-red-400' : 'text-slate-500'} />
                    <span className={`text-xs font-bold uppercase ${insightsData.runawayTasks.length > 0 ? 'text-red-300' : 'text-slate-500'}`}>
                      Runaway Tasks
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {insightsData.runawayTasks.length > 0
                      ? `${insightsData.runawayTasks.length} task${insightsData.runawayTasks.length !== 1 ? 's' : ''} > 10h in-progress`
                      : 'No runaway tasks detected'}
                  </p>
                </div>

                {/* Active Risks */}
                <div className={`rounded-lg p-3 border ${insightsData.activeRisks > 0 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-800/50 border-slate-700/30'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Users size={14} className={insightsData.activeRisks > 0 ? 'text-rose-400' : 'text-slate-500'} />
                    <span className={`text-xs font-bold uppercase ${insightsData.activeRisks > 0 ? 'text-rose-300' : 'text-slate-500'}`}>
                      Active Risks
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {insightsData.activeRisks > 0
                      ? `${insightsData.activeRisks} High/Medium risk${insightsData.activeRisks !== 1 ? 's' : ''} on active projects`
                      : 'No active risks'}
                  </p>
                </div>

                {/* Stuck Tasks */}
                <div className={`rounded-lg p-3 border ${insightsData.stuckTasks.length > 0 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-slate-800/50 border-slate-700/30'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <UserCheck size={14} className={insightsData.stuckTasks.length > 0 ? 'text-orange-400' : 'text-slate-500'} />
                    <span className={`text-xs font-bold uppercase ${insightsData.stuckTasks.length > 0 ? 'text-orange-300' : 'text-slate-500'}`}>
                      Stuck Tasks
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {insightsData.stuckTasks.length > 0
                      ? `${insightsData.stuckTasks.length} task${insightsData.stuckTasks.length !== 1 ? 's' : ''} > 5h for 14+ days`
                      : 'No stuck tasks'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
