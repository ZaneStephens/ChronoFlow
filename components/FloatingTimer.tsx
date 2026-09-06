import React, { useEffect, useState } from "react";
import { ActiveTimer } from "../types";
import { Square, AudioLines, X } from "lucide-react";
interface FloatingTimerProps {
  activeTimer: ActiveTimer | null;
  onStop: () => void;
  onCancel: () => void;
  taskTitle?: string;
}
export default function FloatingTimer({
  activeTimer,
  onStop,
  onCancel,
  taskTitle,
}: FloatingTimerProps) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!activeTimer) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeTimer]);
  if (!activeTimer) return null;
  const seconds = Math.max(0, Math.floor((now - activeTimer.startTime) / 1000));
  const time = [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
  return (
    <div
      id="floating-timer"
      className="timer-dock"
      role="region"
      aria-label="Active time tracker"
    >
      <AudioLines size={25} />
      <div className="dock-copy">
        <span>
          {activeTimer.startTime > now
            ? "WAITING FOR PREVIOUS BILLING BLOCK"
            : "IN YOUR FLOW"}
        </span>
        <strong>{taskTitle || "Open focus session"}</strong>
      </div>
      <span className="dock-time">{time}</span>
      <button
        className="button"
        onClick={onStop}
        aria-label="Finish and save session"
      >
        <Square size={15} />
        <span>Finish session</span>
      </button>
      <button
        className="icon-button"
        onClick={onCancel}
        aria-label="Discard active timer"
      >
        <X size={16} />
      </button>
    </div>
  );
}
