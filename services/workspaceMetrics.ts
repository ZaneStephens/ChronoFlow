import { TimerSession } from "../types";

/** Local calendar boundaries, including daylight-saving days. */
export function dayBounds(timestamp: number): [number, number] {
  const start = new Date(timestamp);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [start.getTime(), end.getTime()];
}
/** Use recorded intervals rather than denormalised task totals; clip midnight crossings. */
export function sessionSecondsInRange(
  sessions: TimerSession[],
  start: number,
  end: number,
): number {
  return sessions.reduce(
    (sum, session) =>
      sum +
      (session.endTime
        ? Math.max(
            0,
            Math.min(end, session.endTime) - Math.max(start, session.startTime),
          ) / 1000
        : 0),
    0,
  );
}
export function durationLabel(seconds: number): string {
  const minutes = Math.max(0, Math.floor(seconds / 60));
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}
