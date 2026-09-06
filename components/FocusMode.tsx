import React, { useEffect, useState } from "react";
import { ActiveTimer, Task, Subtask } from "../types";
import { Square, Play, AudioLines, ArrowRight } from "lucide-react";
interface FocusModeProps {
  activeTimer: ActiveTimer | null;
  tasks: Task[];
  subtasks: Subtask[];
  onStopTimer: () => void;
  onStartTimer: (taskId?: string, subtaskId?: string) => void;
}
export default function FocusMode({
  activeTimer,
  tasks,
  subtasks,
  onStopTimer,
  onStartTimer,
}: FocusModeProps) {
  const [now, setNow] = useState(Date.now());
  const [selected, setSelected] = useState("");
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const elapsed = activeTimer
    ? Math.max(0, Math.floor((now - activeTimer.startTime) / 1000))
    : 0;
  const clock = [
    Math.floor(elapsed / 3600),
    Math.floor(elapsed / 60) % 60,
    elapsed % 60,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
  const task = tasks.find((t) => t.id === activeTimer?.taskId);
  const subtask = subtasks.find((s) => s.id === activeTimer?.subtaskId);
  return (
    <div className="focus-space">
      <div className="focus-intro">
        <AudioLines size={27} />
        <p className="eyebrow">A LITTLE SPACE TO FOCUS</p>
      </div>
      <h1>
        {activeTimer ? "Right here. One thing." : "Less noise. More flow."}
      </h1>
      <p className="focus-subtitle">
        {activeTimer
          ? subtask?.title ||
            task?.title ||
            "Uninterrupted time, just for this."
          : "Choose one thing to give your attention to."}
      </p>
      <div className="focus-clock" aria-label={`Elapsed time ${clock}`}>
        {clock}
      </div>
      <div className="focus-controls">
        {!activeTimer && (
          <select
            aria-label="Task to focus on"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Open focus session</option>
            {tasks
              .filter((t) => t.status !== "done")
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
          </select>
        )}
        <button
          className="button primary"
          onClick={() =>
            activeTimer ? onStopTimer() : onStartTimer(selected || undefined)
          }
        >
          {activeTimer ? <Square size={17} /> : <Play size={17} />}
          {activeTimer ? "Finish session" : "Start focusing"}
          {!activeTimer && <ArrowRight size={17} />}
        </button>
      </div>
      <p className="focus-footnote">
        {activeTimer
          ? "Your timer keeps running when you leave this space."
          : "Time is rounded up to six-minute blocks when you finish."}
      </p>
      <div className="focus-bottom">YOU DON’T HAVE TO DO IT ALL AT ONCE.</div>
    </div>
  );
}
