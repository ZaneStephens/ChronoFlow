import test from "node:test";
import assert from "node:assert/strict";
import { buildDayCsv, DAY_CSV_HEADER } from "../services/dayExport";
import { dayBounds, sessionSecondsInRange } from "../services/workspaceMetrics";
import { Client, Task, Subtask, TimerSession } from "../types";

const time = (h: number, m = 0) => new Date(2026, 8, 6, h, m).getTime();
const clients: Client[] = [
  { id: "c1", name: "Northside", color: "#446644" },
  { id: "c2", name: "Acme", color: "#888844" },
];
const tasks: Task[] = [
  {
    id: "t1",
    title: "Security review",
    description: "",
    clientId: "c1",
    ticketNumber: "1042",
    status: "todo",
    createdAt: time(8),
    totalTime: 360,
  },
];
const subtasks: Subtask[] = [
  {
    id: "st1",
    taskId: "t1",
    title: "Review policies",
    isCompleted: false,
    totalTime: 360,
  },
];
const sessions: TimerSession[] = [
  {
    id: "s1",
    taskId: "t1",
    startTime: time(9),
    endTime: time(9, 6),
    notes: "<p>Reviewed policies</p>",
  },
  {
    id: "s2",
    clientId: "c2",
    customTitle: "Daily check",
    startTime: time(10),
    endTime: time(10, 30),
  },
  {
    id: "s3",
    taskId: "t1",
    subtaskId: "st1",
    startTime: time(11),
    endTime: time(11, 6),
    notes: "Other notes",
  },
  { id: "s4", startTime: time(12), endTime: time(12, 6) },
  { id: "running", startTime: time(13) },
];
test("day CSV preserves exact legacy header, field order, quoting, local formats and client ordering", () => {
  const date = new Date(time(9)).toLocaleDateString();
  assert.equal(
    buildDayCsv(sessions, tasks, clients, subtasks),
    `${DAY_CSV_HEADER}\n"","Acme","${date}","10:00","10:30","Daily check"\n"1042","Northside","${date}","9:00","9:06","Reviewed policies"\n"1042","Northside","${date}","11:00","11:06","Review policies"\n"","Quick Entry","${date}","12:00","12:06","No Desc"`,
  );
});
test("CSV empty day retains the six-column header and newline", () =>
  assert.equal(
    buildDayCsv([], [], [], []),
    "Ticket #,Client,Date,Start,End,Description\n",
  ));
test("CSV correctly escapes embedded quotes, commas, multiline notes and non-ASCII text", () => {
  const csv = buildDayCsv(
    [
      {
        id: "q",
        startTime: time(9),
        endTime: time(10),
        notes: 'Said "hello", café\nSecond line',
      },
    ],
    [],
    [],
    [],
  );
  assert.ok(csv.endsWith('"Said ""hello"", café\nSecond line"'));
});
test("CSV task client takes precedence, with direct-client fallback for orphaned tasks", () => {
  const csv = buildDayCsv(
    [
      {
        id: "a",
        taskId: "missing",
        clientId: "c2",
        startTime: time(9),
        endTime: time(10),
        customTitle: "Preserved entry",
      },
    ],
    tasks,
    clients,
    [],
  );
  assert.ok(csv.includes('"","Acme",'));
  assert.ok(csv.endsWith('"Preserved entry"'));
});
test("daily metrics exclude future dates, clip midnight and avoid unfinished sessions", () => {
  const [start, end] = dayBounds(time(12));
  const sample: TimerSession[] = [
    { id: "overnight", startTime: start - 1800000, endTime: start + 1800000 },
    { id: "late", startTime: end - 600000, endTime: end + 600000 },
    { id: "future", startTime: end + 3600000, endTime: end + 7200000 },
    { id: "unfinished", startTime: start + 3600000 },
  ];
  assert.equal(sessionSecondsInRange(sample, start, end), 2400);
});
test("day boundaries use the next calendar day across Australian daylight saving", () => {
  const [start, end] = dayBounds(new Date(2026, 9, 4, 12).getTime());
  assert.equal(new Date(start).getDate(), 4);
  assert.equal(new Date(end).getDate(), 5);
  if (Intl.DateTimeFormat().resolvedOptions().timeZone === "Australia/Sydney")
    assert.equal((end - start) / 3600000, 23);
});
