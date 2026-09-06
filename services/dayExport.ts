import { Client, Subtask, Task, TimerSession } from "../types";

/** Compatibility contract: names/order, local date/time, quoted fields, LF, no BOM. */
export const DAY_CSV_HEADER = "Ticket #,Client,Date,Start,End,Description";
export function buildDayCsv(
  sessions: TimerSession[],
  tasks: Task[],
  clients: Client[],
  subtasks: Subtask[],
): string {
  const time = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
  };
  const rows = sessions
    .filter((s) => s.endTime)
    .map((session) => {
      const task = tasks.find((t) => t.id === session.taskId);
      const client =
        clients.find((c) => c.id === task?.clientId) ||
        clients.find((c) => c.id === session.clientId);
      const subtask = subtasks.find((s) => s.id === session.subtaskId);
      const notes = session.notes
        ? session.notes.replace(/<[^>]*>?/gm, "")
        : "";
      return [
        task?.ticketNumber || "",
        client?.name || "Quick Entry",
        new Date(session.startTime).toLocaleDateString(),
        time(session.startTime),
        time(session.endTime!),
        subtask
          ? subtask.title
          : notes || session.customTitle || task?.title || "No Desc",
      ];
    });
  rows.sort((a, b) => a[1].localeCompare(b[1]));
  return (
    DAY_CSV_HEADER +
    "\n" +
    rows
      .map((row) =>
        row.map((field) => `"${field.replace(/"/g, '""')}"`).join(","),
      )
      .join("\n")
  );
}
export function downloadDayCsv(
  dateKey: string,
  sessions: TimerSession[],
  tasks: Task[],
  clients: Client[],
  subtasks: Subtask[],
) {
  const blob = new Blob([buildDayCsv(sessions, tasks, clients, subtasks)], {
    type: "text/csv",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `timesheet_${dateKey}.csv`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
