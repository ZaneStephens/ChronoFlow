import React, { useState, useEffect, useRef } from 'react';
import { TimerSession, Task, Client, Subtask, PlannedActivity, RecurringActivity } from '../types';
import { Download, ChevronLeft, ChevronRight, Play, CheckSquare, Square, MoreVertical, Zap, Calendar, Trash2, Repeat, PlusCircle, ZoomIn, ZoomOut } from 'lucide-react';

interface TimelineProps {
  sessions: TimerSession[];
  plannedActivities: PlannedActivity[];
  recurringActivities: RecurringActivity[];
  tasks: Task[];
  clients: Client[];
  subtasks: Subtask[];
  onAddPlan: (date: string, time: number, initialDuration?: number) => void;
  onToggleLog: (activityId: string) => void;
  onStartTimer: (taskId?: string, subtaskId?: string, startTimeOverride?: number) => void;
  onDeletePlan: (id: string) => void;
  onEditSession: (session: TimerSession) => void;
  onPreviewTask: (task: Task) => void;
  onManualEntry: (startTime: number, endTime: number) => void;
}

const Timeline: React.FC<TimelineProps> = ({ 
  sessions, 
  plannedActivities,
  recurringActivities,
  tasks, 
  clients, 
  subtasks,
  onAddPlan,
  onToggleLog,
  onStartTimer,
  onDeletePlan,
  onEditSession,
  onPreviewTask,
  onManualEntry
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentTimeSydney, setCurrentTimeSydney] = useState('');
  const [gapMenuSessionId, setGapMenuSessionId] = useState<string | null>(null);
  const [pixelsPerHour, setPixelsPerHour] = useState(120);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Constants for Layout
  const START_HOUR = 6;
  const END_HOUR = 18; // 6 PM
  const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * pixelsPerHour;

  // Update Sydney Time Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeString = new Intl.DateTimeFormat('en-AU', {
        timeZone: 'Australia/Sydney',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).format(now);
      setCurrentTimeSydney(timeString);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    
    // Scroll to current time on mount (approx)
    if (scrollContainerRef.current) {
        const now = new Date();
        const hours = now.getHours() + now.getMinutes() / 60;
        const scrollPos = (hours - START_HOUR) * pixelsPerHour - 100;
        scrollContainerRef.current.scrollTop = Math.max(0, scrollPos);
    }
    
    return () => clearInterval(timer);
  }, []); // Only on mount

  // Navigation
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };
  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const handleZoomIn = () => setPixelsPerHour(prev => Math.min(prev + 20, 240));
  const handleZoomOut = () => setPixelsPerHour(prev => Math.max(prev - 20, 60));
  
  // FIX: Use Local Time for Date Key to prevent timezone drift
  const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  
  const dateKey = formatDateKey(selectedDate);

  // --- Filter items for the selected day ---
  const dayStart = new Date(selectedDate);
  dayStart.setHours(0,0,0,0);
  const dayEnd = new Date(selectedDate);
  dayEnd.setHours(23,59,59,999);

  // 1. Manual Plans
  const manualPlans = plannedActivities.filter(p => p.date === dateKey);
  
  // 2. Generate Ghost Plans from Recurring Rules
  const ghostPlans: PlannedActivity[] = recurringActivities.map(rule => {
      // Check if rule applies to selectedDate
      let matches = false;
      const dayOfWeek = selectedDate.getDay(); // 0-6
      const dayOfMonth = selectedDate.getDate(); // 1-31

      // Daily (Mon-Fri)
      if (rule.frequency === 'daily') {
          if (dayOfWeek !== 0 && dayOfWeek !== 6) matches = true;
      }

      // Weekly
      if (rule.frequency === 'weekly' && rule.weekDays?.includes(dayOfWeek)) matches = true;

      // Fortnightly
      if (rule.frequency === 'fortnightly' && rule.startDate) {
          const start = new Date(rule.startDate);
          // Only if selectedDate is ON or AFTER start date
          if (dayStart.getTime() >= new Date(start.setHours(0,0,0,0)).getTime()) {
             const oneDay = 24 * 60 * 60 * 1000;
             const d1 = new Date(dateKey); 
             const d2 = new Date(rule.startDate);
             const diffDays = Math.round((d1.getTime() - d2.getTime()) / oneDay);
             
             if (diffDays >= 0 && diffDays % 14 === 0) {
                 matches = true;
             }
          }
      }

      // Monthly
      if (rule.frequency === 'monthly' && rule.monthDay === dayOfMonth) matches = true;
      
      // Monthly Nth
      if (rule.frequency === 'monthly-nth') {
          if (rule.nthWeekDay === dayOfWeek) {
               const nth = Math.floor((dayOfMonth - 1) / 7) + 1;
               if (rule.nthWeek === nth) matches = true;
               // Handle 'Last' (5) special case
               if (rule.nthWeek === 5) {
                   const nextWeek = new Date(selectedDate);
                   nextWeek.setDate(dayOfMonth + 7);
                   if (nextWeek.getMonth() !== selectedDate.getMonth()) matches = true;
               }
          }
      }

      if (!matches) return null;

      // Check if this rule is ALREADY instantiated in manualPlans
      if (manualPlans.some(p => p.recurringId === rule.id)) return null;

      // Create Ghost Plan
      const [h, m] = rule.startTimeStr.split(':').map(Number);
      const ghostStart = new Date(selectedDate);
      ghostStart.setHours(h, m, 0, 0);

      return {
          id: `ghost_${rule.id}_${dateKey}`, // Special ID format
          date: dateKey,
          startTime: ghostStart.getTime(),
          durationMinutes: rule.durationMinutes,
          type: rule.type,
          taskId: rule.taskId,
          clientId: rule.clientId,
          quickTitle: rule.quickTitle,
          isLogged: false,
          recurringId: rule.id
      };
  }).filter(Boolean) as PlannedActivity[];

  // Combine plans
  const dayPlans = [...manualPlans, ...ghostPlans];

  // Sessions
  const daySessions = sessions
    .filter(s => s.startTime >= dayStart.getTime() && s.startTime <= dayEnd.getTime())
    .sort((a, b) => a.startTime - b.startTime);

  // --- Helpers for Position & Collision ---

  const getPosition = (startTime: number, endTime: number) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    const startHours = start.getHours() + start.getMinutes() / 60;
    const endHours = end.getHours() + end.getMinutes() / 60;

    const top = (startHours - START_HOUR) * pixelsPerHour;
    const height = (endHours - startHours) * pixelsPerHour;

    return { top, height };
  };

  // Safe Time Calculation (Smart Shrinking)
  const getBusyRanges = () => {
      return [
          ...daySessions.map(s => ({ start: s.startTime, end: s.endTime || Date.now() })),
          ...dayPlans.map(p => ({ start: p.startTime, end: p.startTime + p.durationMinutes * 60 * 1000 }))
      ].sort((a, b) => a.start - b.start);
  };

  const calculateSafeDuration = (startTime: number, maxDesiredMinutes: number = 30): number => {
      const busyRanges = getBusyRanges();
      
      // Find nearest next start time
      const nextBusy = busyRanges.find(r => r.start > startTime + 1000); // +1s buffer
      
      const dayEndTime = new Date(selectedDate);
      dayEndTime.setHours(END_HOUR, 0, 0, 0);
      
      const limitTime = nextBusy ? nextBusy.start : dayEndTime.getTime();
      const availableMs = limitTime - startTime;
      
      const availableMinutes = Math.floor(availableMs / 60000);
      
      // Min 5 mins, Max desired
      return Math.max(5, Math.min(maxDesiredMinutes, availableMinutes));
  };

  const calculateSafeStartBefore = (endTime: number, maxDesiredMinutes: number = 30): { start: number, duration: number } => {
      const busyRanges = getBusyRanges().sort((a,b) => a.end - b.end);
      
      // Find last busy range ending before or at endTime
      const prevBusy = busyRanges.filter(r => r.end <= endTime - 1000).pop(); // -1s buffer
      
      const dayStartTime = new Date(selectedDate);
      dayStartTime.setHours(START_HOUR, 0, 0, 0);
      
      const limitTime = prevBusy ? prevBusy.end : dayStartTime.getTime();
      const availableMs = endTime - limitTime;
      const availableMinutes = Math.floor(availableMs / 60000);
      
      const duration = Math.max(5, Math.min(maxDesiredMinutes, availableMinutes));
      const start = endTime - (duration * 60 * 1000);
      
      return { start, duration };
  };

  // Helper: Handle clicking the background to plan
  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top; // Relative to the container content
    
    // Calculate time from Y
    const hoursFromStart = clickY / pixelsPerHour;
    const absoluteHours = START_HOUR + hoursFromStart;
    
    const clickedDate = new Date(selectedDate);
    clickedDate.setHours(Math.floor(absoluteHours));
    clickedDate.setMinutes(Math.floor((absoluteHours % 1) * 60));
    clickedDate.setSeconds(0);
    clickedDate.setMilliseconds(0);

    const safeDuration = calculateSafeDuration(clickedDate.getTime(), 30);
    onAddPlan(dateKey, clickedDate.getTime(), safeDuration);
  };

  // Current Time Line Position (only if today)
  const now = new Date();
  const isToday = formatDateKey(now) === dateKey;
  const currentHours = now.getHours() + now.getMinutes() / 60;
  const currentTimeTop = (currentHours - START_HOUR) * pixelsPerHour;

  const handleExportCSV = () => {
    const rows = daySessions.filter(s => s.endTime).map(s => {
       const task = s.taskId ? tasks.find(t => t.id === s.taskId) : null;
       let client = task ? clients.find(c => c.id === task.clientId) : null;
       if (!client && s.clientId) {
         client = clients.find(c => c.id === s.clientId) || null;
       }

       const sub = s.subtaskId ? subtasks.find(st => st.id === s.subtaskId) : null;
       
       const formatTime24 = (ts: number) => {
         const date = new Date(ts);
         const h = date.getHours();
         const m = date.getMinutes().toString().padStart(2, '0');
         return `${h}:${m}`;
       };

       return [
         task?.ticketNumber || '', 
         client?.name || 'Quick Entry',
         new Date(s.startTime).toLocaleDateString(),
         formatTime24(s.startTime),
         formatTime24(s.endTime!),
         sub ? sub.title : (s.notes || s.customTitle || task?.title || 'No Desc')
       ].map(field => `"${field}"`).join(',');
    });
    
    const csvContent = "Ticket #,Client,Date,Start,End,Description\n" + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet_${dateKey}.csv`;
    a.click();
  };

  return (
    <div id="timeline-view" className="flex flex-col h-[calc(100vh-6rem)] gap-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg shrink-0">
        <div className="flex items-center gap-4">
           <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 p-1">
             <button onClick={handlePrevDay} className="p-2 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors"><ChevronLeft size={18} /></button>
             <div className="px-4 font-mono font-medium text-white min-w-[120px] text-center">
               {selectedDate.toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' })}
             </div>
             <button onClick={handleNextDay} className="p-2 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors"><ChevronRight size={18} /></button>
           </div>
           <button 
             onClick={() => setSelectedDate(new Date())}
             className="text-xs font-medium text-indigo-400 hover:text-indigo-300 underline"
           >
             Today
           </button>
        </div>

        <div className="flex items-center gap-6 mt-4 md:mt-0">
          <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 p-1">
              <button onClick={handleZoomOut} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded" title="Zoom Out"><ZoomOut size={16} /></button>
              <div className="px-2 text-xs text-slate-500 font-mono select-none">Zoom</div>
              <button onClick={handleZoomIn} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded" title="Zoom In"><ZoomIn size={16} /></button>
          </div>
          <div className="h-8 w-px bg-slate-700 hidden md:block"></div>
          <div className="text-right hidden md:block">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Sydney Time</p>
            <p className="text-lg font-mono font-bold text-slate-200">{currentTimeSydney}</p>
          </div>
          <div className="h-8 w-px bg-slate-700 hidden md:block"></div>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-900/20"
          >
            <Download size={16} />
            Export Day
          </button>
        </div>
      </div>

      {/* Timeline View */}
      <div className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl relative overflow-hidden flex flex-col">
         {/* Scrollable Area */}
         <div ref={scrollContainerRef} className="overflow-y-auto flex-1 relative">
            <div className="absolute top-0 left-0 right-0 pointer-events-none z-0">
                {/* Horizontal Hour Lines */}
                {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => {
                    const hour = START_HOUR + i;
                    return (
                        <div key={hour} className="flex items-center border-b border-slate-800/50 box-border absolute w-full" style={{ top: i * pixelsPerHour, height: pixelsPerHour }}>
                            <div className="w-16 text-right pr-4 text-xs font-mono text-slate-500" style={{ marginTop: `-${pixelsPerHour - 16}px` }}>
                                {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                            </div>
                            <div className="flex-1 border-t border-slate-800/30"></div>
                        </div>
                    );
                })}
            </div>

            {/* Content Container (Click Target) */}
            <div 
              className="relative w-full ml-16" 
              style={{ height: TOTAL_HEIGHT }}
              onClick={handleBackgroundClick}
            >
                {/* Current Time Indicator */}
                {isToday && currentHours >= START_HOUR && currentHours <= END_HOUR && (
                    <div 
                        className="absolute left-0 right-0 z-30 flex items-center pointer-events-none"
                        style={{ top: currentTimeTop }}
                    >
                         <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                         <div className="h-px bg-red-500 flex-1 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                    </div>
                )}

                {/* Render PLANNED Activities first (Layer 1) */}
                {dayPlans.map(plan => {
                    const endTime = plan.startTime + (plan.durationMinutes * 60 * 1000);
                    const { top, height } = getPosition(plan.startTime, endTime);
                    
                    if (top < 0 || top > TOTAL_HEIGHT) return null;

                    const task = plan.taskId ? tasks.find(t => t.id === plan.taskId) : null;
                    let client = task ? clients.find(c => c.id === task.clientId) : null;
                    if (!client && plan.clientId) {
                        client = clients.find(c => c.id === plan.clientId) || null;
                    }

                    const isGhost = plan.id.startsWith('ghost_');

                    return (
                        <div
                            key={plan.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (plan.type === 'task' && task && !isGhost) {
                                onPreviewTask(task);
                              }
                            }}
                            className={`absolute left-2 right-2 md:right-1/2 rounded-lg border-2 p-2 transition-all group z-10 flex flex-col overflow-hidden hover:z-50 hover:bg-slate-800 cursor-pointer ${
                                plan.isLogged 
                                ? 'border-dashed border-emerald-500/30 bg-emerald-500/5 opacity-60' 
                                : isGhost
                                    ? 'border-dashed border-indigo-500/50 bg-indigo-500/10 hover:border-indigo-400'
                                    : 'border-dashed border-slate-600 bg-slate-800/40 hover:border-indigo-400'
                            }`}
                            style={{ top, height: Math.max(height, 40) }} // Min height for visibility
                        >
                             <div className="flex justify-between items-start">
                                 <div className="min-w-0">
                                     <div className="flex items-center gap-2">
                                        {plan.type === 'quick' && !client ? (
                                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1 rounded uppercase font-bold">Quick</span>
                                        ) : (
                                            <span className="text-[10px] bg-slate-700 text-slate-300 px-1 rounded uppercase font-bold" style={{ color: client?.color }}>{client?.name}</span>
                                        )}
                                        <span className="text-xs text-slate-400 font-mono">{new Date(plan.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                        {isGhost && (
                                            <span className="text-indigo-400" title="Recurring Activity">
                                                <Repeat size={12} />
                                            </span>
                                        )}
                                     </div>
                                     <h4 className={`text-sm font-medium mt-0.5 truncate ${plan.isLogged ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                                         {plan.type === 'task' ? task?.title : plan.quickTitle}
                                     </h4>
                                 </div>
                                 
                                 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 rounded p-1">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onToggleLog(plan.id); }}
                                        className={`p-1 rounded ${plan.isLogged ? 'text-emerald-400' : 'text-slate-400 hover:text-white'}`}
                                        title={plan.isLogged ? "Mark as not logged" : "Log as completed"}
                                    >
                                        {plan.isLogged ? <CheckSquare size={16} /> : <Square size={16} />}
                                    </button>
                                    
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onDeletePlan(plan.id); }}
                                        className="p-1 text-slate-400 hover:text-red-400"
                                        title={isGhost ? "Delete Recurring Rule" : "Delete Plan"}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                 </div>
                             </div>
                        </div>
                    );
                })}

                {/* Render ACTUAL Sessions (Layer 2 - Top) */}
                {daySessions.map((session, index) => {
                    const duration = (session.endTime || Date.now()) - session.startTime;
                    // If active, it grows until 'now'
                    const displayEndTime = session.endTime || Date.now();
                    const { top, height } = getPosition(session.startTime, displayEndTime);

                    if (top < 0) return null; // Started before 6am (simplified handling)

                    const task = session.taskId ? tasks.find(t => t.id === session.taskId) : null;
                    let client = task ? clients.find(c => c.id === task.clientId) : null;
                    if (!client && session.clientId) {
                        client = clients.find(c => c.id === session.clientId) || null;
                    }

                    const subtask = session.subtaskId ? subtasks.find(s => s.id === session.subtaskId) : null;
                    const isSmall = height < 40;

                    // Gap Detection
                    const prevSession = index > 0 ? daySessions[index - 1] : null;
                    const nextSession = index < daySessions.length - 1 ? daySessions[index + 1] : null;
                    
                    const GAP_THRESHOLD = 5 * 60 * 1000; // 5 mins
                    
                    const hasGapBefore = !prevSession || (session.startTime - (prevSession.endTime || prevSession.startTime) > GAP_THRESHOLD);
                    const hasGapAfter = !nextSession || (nextSession.startTime - displayEndTime > GAP_THRESHOLD);

                    return (
                        <div
                            key={session.id}
                            className="absolute left-6 right-6 md:left-[52%] md:right-4 group z-20"
                            style={{ 
                                top, 
                                height: Math.max(height, 24), // Min height
                            }}
                        >
                            {/* Hover Plus Buttons */}
                            {hasGapBefore && (
                                <button
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      const { start, duration } = calculateSafeStartBefore(session.startTime, 30);
                                      onManualEntry(start, start + duration * 60 * 1000); 
                                    }}
                                    className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 w-6 h-6 bg-slate-700 hover:bg-indigo-600 rounded-full text-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110"
                                    title="Fill gap before (Manual Entry)"
                                >
                                    <PlusCircle size={14} />
                                </button>
                            )}

                            {hasGapAfter && (
                                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-30">
                                   <button
                                       onClick={(e) => {
                                          e.stopPropagation();
                                          setGapMenuSessionId(session.id);
                                       }}
                                       className="w-6 h-6 bg-slate-700 hover:bg-emerald-600 rounded-full text-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110"
                                       title="Fill gap after"
                                   >
                                       <PlusCircle size={14} />
                                   </button>
                                   
                                   {/* Confirmation Menu */}
                                   {gapMenuSessionId === session.id && (
                                       <>
                                          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setGapMenuSessionId(null); }}></div>
                                          <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-1 flex flex-col gap-1 z-50 w-32 animate-in fade-in zoom-in-95 duration-100">
                                             <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onStartTimer(undefined, undefined, displayEndTime);
                                                    setGapMenuSessionId(null);
                                                }}
                                                className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-indigo-600 rounded transition-colors text-left"
                                             >
                                                <Play size={12} /> Start Timer
                                             </button>
                                             <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const safeDuration = calculateSafeDuration(displayEndTime, 30);
                                                    onManualEntry(displayEndTime, displayEndTime + safeDuration * 60 * 1000);
                                                    setGapMenuSessionId(null);
                                                }}
                                                className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-emerald-600 rounded transition-colors text-left"
                                             >
                                                <CheckSquare size={12} /> Manual Log
                                             </button>
                                          </div>
                                       </>
                                   )}
                                </div>
                            )}

                            {/* Main Card */}
                            <div 
                                onClick={(e) => { e.stopPropagation(); onEditSession(session); }}
                                className="w-full h-full rounded-lg shadow-lg border-l-4 overflow-hidden hover:z-50 transition-all hover:scale-[1.01] cursor-pointer"
                                style={{ 
                                    backgroundColor: '#1e293b', // slate-800
                                    borderColor: client?.color || (session.customTitle ? '#10b981' : '#94a3b8') 
                                }}
                                title="Click to edit session"
                            >
                                <div className={`h-full w-full bg-opacity-10 p-2 flex flex-col justify-center ${isSmall ? 'flex-row items-center justify-start gap-2' : ''}`} style={{ backgroundColor: client?.color ? `${client.color}15` : (session.customTitle ? '#10b98115' : undefined) }}>
                                    {!isSmall && (
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] uppercase font-bold text-slate-400">{client?.name || 'Quick Log'}</span>
                                            <span className="text-[10px] font-mono text-slate-500">
                                                {new Date(session.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {session.endTime ? new Date(session.endTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Now'}
                                            </span>
                                        </div>
                                    )}
                                    <h4 className="text-sm font-semibold text-white truncate leading-tight">
                                        {subtask ? subtask.title : (task?.title || session.customTitle || 'Unallocated')}
                                    </h4>
                                    {!isSmall && session.notes && (
                                        <p className="text-xs text-slate-500 truncate mt-1">{session.notes}</p>
                                    )}
                                    {session.isManualLog && (
                                        <div className="absolute top-1 right-1 text-slate-600">
                                            <CheckSquare size={12} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
         </div>
      </div>
    </div>
  );
};

export default Timeline;