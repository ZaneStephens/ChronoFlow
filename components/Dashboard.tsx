
import React, { useEffect, useState } from 'react';
import { Task, TimerSession, Client, ActiveTimer, Subtask } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock, CheckCircle2, TrendingUp, Target, Activity } from 'lucide-react';

interface DashboardProps {
  tasks: Task[];
  clients: Client[];
  subtasks: Subtask[];
  sessions: TimerSession[];
  activeTimer: ActiveTimer | null;
  onEditSession: (session: TimerSession) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ tasks, clients, subtasks, sessions, activeTimer, onEditSession }) => {
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
  // Calculate seconds from "Quick Entry" sessions (those without a taskId)
  const totalSecondsQuick = sessions
    .filter(s => !s.taskId && s.endTime)
    .reduce((acc, s) => acc + (s.endTime! - s.startTime) / 1000, 0);

  const totalSeconds = totalSecondsTasks + totalSecondsQuick;

  // Add active timer to total if it exists
  const activeDuration = activeTimer ? Math.floor((now - activeTimer.startTime) / 1000) : 0;
  // If active timer starts in future, duration is 0
  const validActiveDuration = Math.max(0, activeDuration);
  
  const displayTotalSeconds = totalSeconds + validActiveDuration;
  const totalHours = (displayTotalSeconds / 3600).toFixed(1);
  
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  
  // Calculate Today's Progress
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  
  const todaySecondsCompleted = sessions.reduce((acc, session) => {
    if (session.startTime >= startOfToday.getTime()) {
      const end = session.endTime || now;
      return acc + ((end - session.startTime) / 1000);
    }
    return acc;
  }, 0);

  // If active timer started today, add it
  const activeSecondsToday = (activeTimer && activeTimer.startTime >= startOfToday.getTime()) 
    ? validActiveDuration 
    : 0;

  const totalTodaySeconds = todaySecondsCompleted + activeSecondsToday;
  const todayProgressPercent = Math.min((totalTodaySeconds / DAILY_GOAL_SECONDS) * 100, 100);
  const remainingSeconds = Math.max(DAILY_GOAL_SECONDS - totalTodaySeconds, 0);

  // Chart Data: Hours per client
  const chartData = clients.map(client => {
    const clientTasks = tasks.filter(t => t.clientId === client.id);
    const taskSeconds = clientTasks.reduce((acc, t) => acc + t.totalTime, 0);
    
    // Add quick sessions linked to this client
    const quickSessions = sessions.filter(s => !s.taskId && s.clientId === client.id && s.endTime);
    const quickSeconds = quickSessions.reduce((acc, s) => acc + (s.endTime! - s.startTime) / 1000, 0);

    // Add active time if relevant to this client
    let additional = 0;
    if (activeTimer) {
      const activeTask = tasks.find(t => t.id === activeTimer.taskId);
      if (activeTask && activeTask.clientId === client.id) {
        additional = validActiveDuration;
      }
    }

    const hours = parseFloat(((taskSeconds + quickSeconds + additional) / 3600).toFixed(2));
    return {
      name: client.name,
      hours: hours,
      color: client.color
    };
  });
  
  // Add Unassigned Quick Entries to chart
  const unassignedQuickSeconds = sessions
     .filter(s => !s.taskId && !s.clientId && s.endTime)
     .reduce((acc, s) => acc + (s.endTime! - s.startTime) / 1000, 0);

  if (unassignedQuickSeconds > 0) {
      chartData.push({
          name: 'Quick/Admin',
          hours: parseFloat((unassignedQuickSeconds / 3600).toFixed(2)),
          color: '#10b981' // emerald-500
      });
  }

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const StatCard = ({ title, value, icon: Icon, color, subtext }: any) => (
    <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl flex items-start justify-between">
      <div>
        <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-white">{value}</h3>
        {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-lg ${color} bg-opacity-20`}>
        <Icon size={24} className={color.replace('bg-', 'text-')} />
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
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

        <StatCard 
          title="Total Tracked" 
          value={`${totalHours}h`} 
          icon={Clock} 
          color="bg-blue-500 text-blue-400" 
          subtext="Lifetime total"
        />
        <StatCard 
          title="Completed Tasks" 
          value={completedTasks} 
          icon={CheckCircle2} 
          color="bg-indigo-500 text-indigo-400" 
        />
        <StatCard 
          title="Active Clients" 
          value={clients.length} 
          icon={TrendingUp} 
          color="bg-purple-500 text-purple-400" 
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-8 h-full">
        <div className="lg:col-span-2 space-y-8">
          {/* Chart */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 h-96">
            <h3 className="text-lg font-semibold text-white mb-6">Time Distribution by Client</h3>
            <div className="h-full pb-8">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
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
                    <p className="text-xs text-slate-500">
                      {isToday ? 'Today' : new Date(session.startTime).toLocaleDateString()}
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
