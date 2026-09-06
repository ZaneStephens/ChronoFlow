import React, { useState, useEffect, useMemo } from "react";
import { Client, Task, TimerSession, Subtask } from "../types";
import {
  generateClientReport,
  generateTaskReport,
} from "../services/geminiService";
import {
  FileText,
  Calendar,
  Loader2,
  Sparkles,
  Copy,
  Check,
  Download,
  Filter,
  DollarSign,
  Clock,
  TrendingUp,
} from "lucide-react";

interface ReportGeneratorProps {
  clients: Client[];
  tasks: Task[];
  sessions: TimerSession[];
  subtasks: Subtask[];
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  clients,
  tasks,
  sessions,
  subtasks,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>(""); // For drill down
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );

  const [generatedReport, setGeneratedReport] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [outputTab, setOutputTab] = useState<"ai-report" | "billing">(
    "ai-report",
  );

  // ── Billing Summary (6-min block rounding) ──
  const billingData = useMemo(() => {
    if (!selectedClientId || !startDate || !endDate) return null;

    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1;

    const clientSessions = sessions.filter((s) => {
      if (!s.endTime) return false;
      if (s.startTime < start || s.startTime > end) return false;
      if (s.clientId === selectedClientId) return true;
      if (s.taskId) {
        const task = tasks.find((t) => t.id === s.taskId);
        return task?.clientId === selectedClientId;
      }
      return false;
    });

    // Group by task
    const taskMap = new Map<string, { title: string; rawMinutes: number }>();
    let unallocatedMinutes = 0;

    clientSessions.forEach((s) => {
      const rawMin = (s.endTime! - s.startTime) / 60000;
      if (s.taskId) {
        const task = tasks.find((t) => t.id === s.taskId);
        const key = s.taskId;
        if (!taskMap.has(key)) {
          taskMap.set(key, {
            title: task?.title || "Unknown Task",
            rawMinutes: 0,
          });
        }
        taskMap.get(key)!.rawMinutes += rawMin;
      } else {
        unallocatedMinutes += rawMin;
      }
    });

    const SIX_MIN_BLOCKS = 6; // minutes per block
    const taskRows = Array.from(taskMap.entries())
      .map(([taskId, data]) => {
        const blocks = Math.ceil(data.rawMinutes / SIX_MIN_BLOCKS);
        return {
          taskId,
          title: data.title,
          rawMinutes: data.rawMinutes,
          blocks,
          billableHours: blocks * 0.1,
        };
      })
      .sort((a, b) => b.rawMinutes - a.rawMinutes);

    const unallocatedBlocks = Math.ceil(unallocatedMinutes / SIX_MIN_BLOCKS);
    const totalRawMinutes = clientSessions.reduce(
      (acc, s) => acc + (s.endTime! - s.startTime) / 60000,
      0,
    );
    const totalBlocks = Math.ceil(totalRawMinutes / SIX_MIN_BLOCKS);

    return {
      taskRows,
      unallocatedMinutes,
      unallocatedBlocks,
      totalRawMinutes,
      totalBlocks,
      billableHours: totalBlocks * 0.1,
    };
  }, [selectedClientId, startDate, endDate, sessions, tasks]);

  // --- Logic for Sorting and Top Clients ---
  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.name.localeCompare(b.name)),
    [clients],
  );

  const { topClients, otherClients } = useMemo(() => {
    const counts: Record<string, number> = {};
    // Use Task count for consistency
    tasks.forEach((t) => (counts[t.clientId] = (counts[t.clientId] || 0) + 1));

    const topIds = Object.keys(counts)
      .filter((id) => counts[id] > 0)
      .sort((a, b) => counts[b] - counts[a])
      .slice(0, 3);

    const top = topIds
      .map((id) => clients.find((c) => c.id === id))
      .filter((c): c is Client => !!c);
    const other = sortedClients.filter((c) => !topIds.includes(c.id));

    return { topClients: top, otherClients: other };
  }, [tasks, clients, sortedClients]);
  // ---

  // Reset selected task if client changes
  useEffect(() => {
    setSelectedTaskId("");
  }, [selectedClientId]);

  const clientTasks = tasks.filter((t) => t.clientId === selectedClientId);

  const handleGenerate = async () => {
    if (!selectedClientId) return;

    const client = clients.find((c) => c.id === selectedClientId);
    if (!client) return;

    setIsGenerating(true);
    setGeneratedReport("");

    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1; // End of day

    // BRANCH: Single Task Report
    if (selectedTaskId) {
      const task = tasks.find((t) => t.id === selectedTaskId);
      if (task) {
        // Filter sessions for this specific task
        const taskSessions = sessions.filter(
          (s) =>
            s.taskId === task.id &&
            s.endTime &&
            s.startTime >= start &&
            s.startTime <= end,
        );

        const totalMinutes = taskSessions.reduce(
          (acc, s) => acc + (s.endTime! - s.startTime) / 60000,
          0,
        );
        const totalHours = (totalMinutes / 60).toFixed(2);

        const relevantSubtasks = subtasks.filter((s) => s.taskId === task.id);

        const workLogs = taskSessions
          .map((s) => ({
            date: new Date(s.startTime).toLocaleDateString(),
            durationMinutes: Math.round((s.endTime! - s.startTime) / 60000),
            notes: s.notes || "No notes",
          }))
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );

        const report = await generateTaskReport(
          task.title,
          task.description,
          task.status,
          totalHours,
          relevantSubtasks,
          workLogs,
          client.name,
          client.isInternal || false,
        );
        setGeneratedReport(report || "No report generated.");
      }
    }
    // BRANCH: Client Status Report (Aggregated)
    else {
      const relevantSessions = sessions.filter((s) => {
        if (!s.endTime) return false;
        if (s.startTime < start || s.startTime > end) return false;

        // Check direct client link
        if (s.clientId === selectedClientId) return true;

        // Check task link
        if (s.taskId) {
          const task = tasks.find((t) => t.id === s.taskId);
          return task?.clientId === selectedClientId;
        }

        return false;
      });

      const aggregation = new Map<
        string,
        {
          title: string;
          durationMinutes: number;
          status: string;
          notes: Set<string>;
        }
      >();

      relevantSessions.forEach((session) => {
        let key = "";
        let title = "";
        let status = "Completed";

        if (session.taskId) {
          const task = tasks.find((t) => t.id === session.taskId);
          if (task) {
            key = task.id;
            title = `${task.title}${task.ticketNumber ? ` (#${task.ticketNumber})` : ""}`;
            status = task.status;
          }
        } else {
          key = `quick-${session.id}`;
          title = session.customTitle || "Ad-hoc Support";
          key = `quick-${title}`;
        }

        if (!key) return;

        const durationMins = Math.round(
          (session.endTime! - session.startTime) / 60000,
        );

        if (!aggregation.has(key)) {
          aggregation.set(key, {
            title,
            durationMinutes: 0,
            status,
            notes: new Set(),
          });
        }

        const entry = aggregation.get(key)!;
        entry.durationMinutes += durationMins;
        if (session.notes) {
          entry.notes.add(session.notes);
        }
      });

      const reportItems = Array.from(aggregation.values()).map((item) => ({
        ...item,
        notes: Array.from(item.notes),
      }));

      const report = await generateClientReport(
        client.name,
        new Date(startDate).toLocaleDateString(),
        new Date(endDate).toLocaleDateString(),
        reportItems,
        client.isInternal || false,
      );
      setGeneratedReport(report || "No response generated.");
    }

    setIsGenerating(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="report-generator" className="space-y-6 p-6">
      <div className="page-heading">
        <div>
          <p className="eyebrow">TURN GOOD WORK INTO A CLEAR STORY</p>
          <h1>Let your work speak.</h1>
          <p>
            Review the time, find the detail and shape a useful client update.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="bg-surface border border-line rounded-xl p-6 h-fit space-y-6">
          <div>
            <label className="block text-sm font-medium text-muted mb-2">
              1. Select Client
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full bg-canvas border border-line rounded-lg px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Choose a Client --</option>
              {topClients.length > 0 && (
                <optgroup label="Frequently Used">
                  {topClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="All Clients">
                {otherClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Task Drill Down Dropdown */}
          {selectedClientId && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-sm font-medium text-muted mb-2 flex items-center gap-2">
                <Filter size={14} />
                2. Drill Down (Optional)
              </label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full bg-canvas border border-line rounded-lg px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Full Client Report (All Tasks)</option>
                {clientTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Start Date
              </label>
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-quiet"
                  size={16}
                />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-canvas border border-line rounded-lg pl-10 pr-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                End Date
              </label>
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-quiet"
                  size={16}
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-canvas border border-line rounded-lg pl-10 pr-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!selectedClientId || isGenerating}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-ink font-bold py-3 rounded-lg shadow-lg shadow-indigo-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Generate {selectedTaskId ? "Task" : "Client"} Report
              </>
            )}
          </button>

          <div className="bg-canvas/50 p-4 rounded-lg border border-line/50 text-xs text-quiet">
            {selectedTaskId ? (
              <p>
                Generates a detailed technical summary for the selected task,
                including subtask progress and a chronological narrative of work
                logs.
              </p>
            ) : (
              <p>
                Generates a high-level status email summarizing all activity for
                this client over the selected period.
              </p>
            )}
          </div>
        </div>

        {/* Output Panel */}
        <div className="lg:col-span-2 bg-surface border border-line rounded-xl p-6 flex flex-col h-[600px]">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setOutputTab("ai-report")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  outputTab === "ai-report"
                    ? "bg-indigo-600 text-ink"
                    : "text-muted hover:text-ink bg-inset/50"
                }`}
              >
                <Sparkles size={16} />
                AI Report
              </button>
              <button
                onClick={() => setOutputTab("billing")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  outputTab === "billing"
                    ? "bg-emerald-600 text-ink"
                    : "text-muted hover:text-ink bg-inset/50"
                }`}
              >
                <DollarSign size={16} />
                Billing Summary
              </button>
            </div>
            {outputTab === "ai-report" && generatedReport && (
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 text-sm text-muted hover:text-ink bg-inset hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors"
              >
                {copied ? (
                  <Check size={16} className="text-emerald-400" />
                ) : (
                  <Copy size={16} />
                )}
                {copied ? "Copied" : "Copy Text"}
              </button>
            )}
          </div>

          <div className="flex-1 bg-canvas rounded-lg border border-line p-4 overflow-y-auto text-sm leading-relaxed text-body">
            {outputTab === "ai-report" ? (
              <>
                {generatedReport ? (
                  <div className="whitespace-pre-wrap font-mono">
                    {generatedReport}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-quiet">
                    {isGenerating ? (
                      <div className="text-center space-y-3">
                        <Loader2
                          className="animate-spin mx-auto text-indigo-500"
                          size={40}
                        />
                        <p className="animate-pulse">Consulting Gemini AI...</p>
                      </div>
                    ) : (
                      <>
                        <FileText size={48} className="mb-4 opacity-20" />
                        <p>
                          Select a client and date range, then generate a
                          report.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                {billingData ? (
                  <div className="space-y-4">
                    {billingData.taskRows.length === 0 &&
                    billingData.unallocatedMinutes === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-quiet">
                        <Clock size={48} className="mb-4 opacity-20" />
                        <p>No tracked sessions for this period.</p>
                      </div>
                    ) : (
                      <>
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-2 text-xs font-bold text-muted uppercase tracking-wider px-2 pb-2 border-b border-line">
                          <div className="col-span-5">Task</div>
                          <div className="col-span-2 text-right">Raw Min</div>
                          <div className="col-span-2 text-right">
                            6-min Blocks
                          </div>
                          <div className="col-span-3 text-right">
                            Billable Hours
                          </div>
                        </div>

                        {/* Task Rows */}
                        {billingData.taskRows.map((row) => (
                          <div
                            key={row.taskId}
                            className="grid grid-cols-12 gap-2 text-sm px-2 py-1.5 hover:bg-surface/50 rounded"
                          >
                            <div
                              className="col-span-5 text-ink truncate"
                              title={row.title}
                            >
                              {row.title}
                            </div>
                            <div className="col-span-2 text-right text-muted font-mono">
                              {Math.round(row.rawMinutes)}
                            </div>
                            <div className="col-span-2 text-right text-ink font-mono font-bold">
                              {row.blocks}
                            </div>
                            <div className="col-span-3 text-right text-emerald-400 font-mono font-bold">
                              {row.billableHours.toFixed(1)}
                            </div>
                          </div>
                        ))}

                        {/* Unallocated row */}
                        {billingData.unallocatedMinutes > 0 && (
                          <div className="grid grid-cols-12 gap-2 text-sm px-2 py-1.5 bg-surface/30 rounded">
                            <div className="col-span-5 text-muted italic">
                              Unallocated / Quick
                            </div>
                            <div className="col-span-2 text-right text-muted font-mono">
                              {Math.round(billingData.unallocatedMinutes)}
                            </div>
                            <div className="col-span-2 text-right text-ink font-mono">
                              {billingData.unallocatedBlocks}
                            </div>
                            <div className="col-span-3 text-right text-emerald-400 font-mono">
                              {(billingData.unallocatedBlocks * 0.1).toFixed(1)}
                            </div>
                          </div>
                        )}

                        {/* Total */}
                        <div className="grid grid-cols-12 gap-2 text-sm px-2 py-2 mt-2 border-t border-indigo-500/30 bg-indigo-500/5 rounded-b">
                          <div className="col-span-5 text-ink font-bold">
                            Total
                          </div>
                          <div className="col-span-2 text-right text-ink font-mono font-bold">
                            {Math.round(billingData.totalRawMinutes)}
                          </div>
                          <div className="col-span-2 text-right text-indigo-300 font-mono font-bold text-base">
                            {billingData.totalBlocks}
                          </div>
                          <div className="col-span-3 text-right text-emerald-300 font-mono font-bold text-base">
                            {billingData.billableHours.toFixed(1)}h
                          </div>
                        </div>

                        {/* Info note */}
                        <p className="text-xs text-quiet mt-4 flex items-start gap-1">
                          <Clock size={12} className="mt-0.5 shrink-0" />
                          Rounded up to the nearest 6-minute block (MSP billing
                          standard). 1 block = 0.1 hours.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-quiet">
                    <DollarSign size={48} className="mb-4 opacity-20" />
                    <p>
                      Select a client and date range to view billing summary.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;
