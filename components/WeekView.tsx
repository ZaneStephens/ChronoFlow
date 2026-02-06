import React, { useState, useMemo } from 'react';
import { TimerSession, Task, Client } from '../types';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, Flame } from 'lucide-react';

interface WeekViewProps {
  sessions: TimerSession[];
  tasks: Task[];
  clients: Client[];
  section?: 'overview' | 'heatmap';
}

const WeekView: React.FC<WeekViewProps> = ({ sessions, tasks, clients, section }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [heatmapMonth, setHeatmapMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const DAILY_GOAL_HOURS = 7.6;
  const DAILY_GOAL_SECONDS = DAILY_GOAL_HOURS * 3600;

  // Week calculation
  const getWeekDates = (offset: number) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    // Start from Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7) + offset * 7);
    monday.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  };

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const getDaySeconds = (date: Date): number => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return sessions
      .filter(s => s.startTime >= start.getTime() && s.startTime <= end.getTime() && s.endTime)
      .reduce((acc, s) => acc + ((s.endTime! - s.startTime) / 1000), 0);
  };

  const weekData = useMemo(() => {
    return weekDates.map(date => {
      const totalSeconds = getDaySeconds(date);
      const percentage = Math.min((totalSeconds / DAILY_GOAL_SECONDS) * 100, 100);
      const isToday = date.toDateString() === new Date().toDateString();
      const isFuture = date > new Date();
      return { date, totalSeconds, percentage, isToday, isFuture };
    });
  }, [weekDates, sessions]);

  const weekTotalSeconds = weekData.reduce((a, d) => a + d.totalSeconds, 0);
  const weekGoalSeconds = 5 * DAILY_GOAL_SECONDS; // 5 working days
  const weekPercentage = Math.min((weekTotalSeconds / weekGoalSeconds) * 100, 100);
  const daysMetGoal = weekData.filter(d => d.totalSeconds >= DAILY_GOAL_SECONDS).length;

  // Client breakdown for the week
  const weekClientBreakdown = useMemo(() => {
    const weekStart = weekDates[0].getTime();
    const weekEnd = new Date(weekDates[6]);
    weekEnd.setHours(23, 59, 59, 999);

    const clientMap = new Map<string, { name: string; color: string; seconds: number }>();

    sessions
      .filter(s => s.startTime >= weekStart && s.startTime <= weekEnd.getTime() && s.endTime)
      .forEach(s => {
        const duration = (s.endTime! - s.startTime) / 1000;
        let clientId = s.clientId;
        if (!clientId && s.taskId) {
          const task = tasks.find(t => t.id === s.taskId);
          if (task) clientId = task.clientId;
        }

        const key = clientId || '__unassigned';
        const client = clientId ? clients.find(c => c.id === clientId) : null;
        const existing = clientMap.get(key);

        if (existing) {
          existing.seconds += duration;
        } else {
          clientMap.set(key, {
            name: client?.name || 'Unassigned',
            color: client?.color || '#94a3b8',
            seconds: duration,
          });
        }
      });

    return Array.from(clientMap.values())
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 6);
  }, [weekDates, sessions, tasks, clients]);

  // Heatmap data
  const heatmapData = useMemo(() => {
    const { year, month } = heatmapMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = (firstDay.getDay() + 6) % 7; // Monday-based

    const days: { date: Date | null; seconds: number }[] = [];

    // Padding for start of month
    for (let i = 0; i < startPad; i++) {
      days.push({ date: null, seconds: 0 });
    }

    // Actual days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      days.push({ date, seconds: getDaySeconds(date) });
    }

    return days;
  }, [heatmapMonth, sessions]);

  const getHeatColor = (seconds: number): string => {
    if (seconds === 0) return 'bg-slate-800';
    const ratio = seconds / DAILY_GOAL_SECONDS;
    if (ratio < 0.25) return 'bg-indigo-900/60';
    if (ratio < 0.5) return 'bg-indigo-800/70';
    if (ratio < 0.75) return 'bg-indigo-700/80';
    if (ratio < 1) return 'bg-indigo-600/90';
    return 'bg-indigo-500';
  };

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const handlePrevHeatmapMonth = () => {
    setHeatmapMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
  };

  const handleNextHeatmapMonth = () => {
    setHeatmapMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: prev.month + 1 };
    });
  };

  const monthName = new Date(heatmapMonth.year, heatmapMonth.month).toLocaleString('default', { month: 'long', year: 'numeric' });

  // Streak calculation
  const currentStreak = useMemo(() => {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const day = checkDate.getDay();
      // Skip weekends
      if (day === 0 || day === 6) continue;

      const daySeconds = getDaySeconds(checkDate);
      if (daySeconds >= DAILY_GOAL_SECONDS * 0.5) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [sessions]);

  const showOverview = !section || section === 'overview';
  const showHeatmap = !section || section === 'heatmap';

  return (
    <div className="space-y-6">
      {/* Week Overview */}
      {showOverview && <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">Week Overview</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(prev => prev - 1)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 px-2"
            >
              {weekOffset === 0 ? 'This Week' : 'Go to This Week'}
            </button>
            <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Week summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-900 rounded-lg p-3 border border-slate-700/50">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Week Total</p>
            <p className="text-xl font-bold text-white">{formatDuration(weekTotalSeconds)}</p>
            <p className="text-xs text-slate-500">{weekPercentage.toFixed(0)}% of {formatDuration(weekGoalSeconds)} goal</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3 border border-slate-700/50">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Days at Goal</p>
            <p className="text-xl font-bold text-white">{daysMetGoal} <span className="text-sm text-slate-500">/ 5</span></p>
            <p className="text-xs text-slate-500">working days</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3 border border-slate-700/50">
            <div className="flex items-center gap-1.5 mb-1">
              <Flame size={12} className="text-orange-400" />
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Streak</p>
            </div>
            <p className="text-xl font-bold text-white">{currentStreak} <span className="text-sm text-slate-500">days</span></p>
            <p className="text-xs text-slate-500">50%+ daily goal</p>
          </div>
        </div>

        {/* Day bars */}
        <div className="grid grid-cols-7 gap-2">
          {weekData.map(({ date, totalSeconds, percentage, isToday, isFuture }) => {
            const dayLabel = date.toLocaleDateString('en-AU', { weekday: 'short' });
            const dateLabel = date.getDate();
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            return (
              <div
                key={date.toISOString()}
                className={`flex flex-col items-center gap-2 p-2 rounded-lg transition-colors ${
                  isToday ? 'bg-indigo-500/10 ring-1 ring-indigo-500/30' : ''
                } ${isWeekend ? 'opacity-50' : ''}`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {dayLabel}
                </div>
                <div className={`text-sm font-bold ${isToday ? 'text-indigo-400' : 'text-slate-300'}`}>
                  {dateLabel}
                </div>
                {/* Vertical bar */}
                <div className="w-full h-24 bg-slate-900 rounded-md overflow-hidden flex flex-col-reverse border border-slate-700/50">
                  <div
                    className={`w-full transition-all duration-500 rounded-b-md ${
                      percentage >= 100
                        ? 'bg-emerald-500'
                        : percentage >= 75
                        ? 'bg-indigo-500'
                        : percentage >= 50
                        ? 'bg-indigo-600'
                        : percentage > 0
                        ? 'bg-indigo-700'
                        : ''
                    }`}
                    style={{ height: `${isFuture ? 0 : percentage}%` }}
                  />
                </div>
                <div className="text-xs font-mono text-slate-400">
                  {isFuture ? '—' : formatDuration(totalSeconds)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Client breakdown for the week */}
        {weekClientBreakdown.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-700/50">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-3">Client Distribution</p>
            <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-slate-900">
              {weekClientBreakdown.map((c, i) => (
                <div
                  key={i}
                  className="h-full transition-all duration-500"
                  style={{
                    backgroundColor: c.color,
                    width: `${weekTotalSeconds > 0 ? (c.seconds / weekTotalSeconds) * 100 : 0}%`,
                  }}
                  title={`${c.name}: ${formatDuration(c.seconds)}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {weekClientBreakdown.map((c, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                  <span>{c.name}</span>
                  <span className="text-slate-600 font-mono">{formatDuration(c.seconds)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>}

      {/* Monthly Heatmap */}
      {showHeatmap && <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp size={20} className="text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">Activity Heatmap</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrevHeatmapMonth} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium text-slate-300 min-w-[130px] text-center">{monthName}</span>
            <button onClick={handleNextHeatmapMonth} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-600">
              {d}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {heatmapData.map((day, i) => {
            if (!day.date) {
              return <div key={`pad-${i}`} className="aspect-square rounded-md" />;
            }

            const isToday = day.date.toDateString() === new Date().toDateString();

            return (
              <div
                key={day.date.toISOString()}
                className={`aspect-square rounded-md flex items-center justify-center relative group cursor-default transition-all ${getHeatColor(day.seconds)} ${
                  isToday ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-800' : ''
                } hover:ring-1 hover:ring-slate-500`}
              >
                <span className={`text-xs font-medium ${day.seconds > 0 ? 'text-white/80' : 'text-slate-600'}`}>
                  {day.date.getDate()}
                </span>

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg shadow-xl text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  <p className="font-medium">{day.date.toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  <p className="text-slate-400 font-mono">{day.seconds > 0 ? formatDuration(day.seconds) : 'No activity'}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-4">
          <span className="text-[10px] text-slate-500">Less</span>
          <div className="w-3 h-3 rounded-sm bg-slate-800 border border-slate-700" />
          <div className="w-3 h-3 rounded-sm bg-indigo-900/60" />
          <div className="w-3 h-3 rounded-sm bg-indigo-800/70" />
          <div className="w-3 h-3 rounded-sm bg-indigo-700/80" />
          <div className="w-3 h-3 rounded-sm bg-indigo-600/90" />
          <div className="w-3 h-3 rounded-sm bg-indigo-500" />
          <span className="text-[10px] text-slate-500">More</span>
        </div>
      </div>}
    </div>
  );
};

export default WeekView;
