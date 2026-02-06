
import React, { useEffect, useState, useMemo } from 'react';
import { Task, TimerSession, Client, ActiveTimer } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock, CheckCircle2, TrendingUp, Target, Activity } from 'lucide-react';

interface DashboardProps {
  tasks: Task[];
  clients: Client[];
  sessions: TimerSession[];
  activeTimer: ActiveTimer | null;
  plannedActivities?: any[];
  onStartTimer?: (taskId?: string, subtaskId?: string) => void;
  onStopTimer?: () => void;
  children?: React.ReactNode;
}

const Dashboard: React.FC<DashboardProps> = ({ tasks, clients, sessions, activeTimer, children }) => {
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
    </div>
  );
};

export default Dashboard;
