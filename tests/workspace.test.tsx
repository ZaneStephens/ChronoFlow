import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import "fake-indexeddb/auto";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
});
for (const key of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLDialogElement",
  "Node",
  "Event",
  "MouseEvent",
  "File",
  "FileReader",
  "localStorage",
  "getComputedStyle",
])
  Object.defineProperty(globalThis, key, {
    value: dom.window[key],
    configurable: true,
    writable: true,
  });
Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
  value: true,
  writable: true,
});
HTMLElement.prototype.scrollIntoView = function () {};
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute("open");
};
const React = await import("react");
const { render, screen, within, cleanup, waitFor } =
  await import("@testing-library/react");
const userEvent = (await import("@testing-library/user-event")).default;
const App = (await import("../App")).default;
const { setManyStores, getAllStores, migrateFromLocalStorage } =
  await import("../services/storageService");

const today = new Date();
today.setHours(9, 0, 0, 0);
const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
const fixture = {
  version: 1,
  timestamp: 1,
  clients: [
    {
      id: "legacy-client",
      name: "Legacy Client",
      color: "#53744b",
      isInternal: false,
      contactName: "Test contact",
      services: "Managed services",
    },
  ],
  projects: [
    {
      id: "legacy-project",
      title: "Legacy project",
      clientId: "legacy-client",
      description: "Migration",
      status: "active",
      startDate: dateKey,
      milestones: [{ id: "milestone", title: "Discovery", isCompleted: false }],
      risks: [],
    },
  ],
  customTemplates: [
    {
      id: "template",
      title: "Existing template",
      description: "Preserve me",
      structure: {
        milestones: [{ title: "Start", dueDateOffsetDays: 1 }],
        risks: [],
      },
    },
  ],
  rocks: [
    {
      id: "legacy-rock",
      title: "Legacy goal",
      description: "Quarterly outcome",
      status: "on-track",
      quarter: "Q3 2026",
      keyResults: [{ id: "kr", title: "Deliver", isCompleted: false }],
      createdAt: 1,
    },
  ],
  tasks: [
    {
      id: "legacy-task",
      clientId: "legacy-client",
      projectId: "legacy-project",
      title: "Legacy task",
      description: "Keep existing work",
      ticketNumber: "1042",
      status: "todo",
      totalTime: 360,
      createdAt: 1,
      link: "https://example.com/ticket/1042",
    },
  ],
  subtasks: [
    {
      id: "legacy-subtask",
      taskId: "legacy-task",
      title: "Existing step",
      isCompleted: false,
      totalTime: 0,
    },
  ],
  sessions: [
    {
      id: "legacy-session",
      taskId: "legacy-task",
      clientId: "legacy-client",
      projectId: "legacy-project",
      milestoneId: "milestone",
      startTime: today.getTime(),
      endTime: today.getTime() + 360000,
      notes: "<p>Existing rich notes</p>",
      isManualLog: false,
    },
  ],
  plannedActivities: [
    {
      id: "legacy-plan",
      date: dateKey,
      startTime: today.getTime() + 7200000,
      durationMinutes: 30,
      type: "quick",
      clientId: "legacy-client",
      quickTitle: "Daily check",
      isLogged: false,
    },
  ],
  recurringActivities: [
    {
      id: "legacy-rule",
      startDate: dateKey,
      type: "quick",
      clientId: "legacy-client",
      quickTitle: "Standup",
      startTimeStr: "10:00",
      durationMinutes: 15,
      frequency: "daily",
    },
  ],
};
const blobs = new Map<string, Blob>();
let downloads: { name: string; blob: Blob }[] = [];
URL.createObjectURL = (blob: Blob) => {
  const id = `blob:test-${blobs.size}`;
  blobs.set(id, blob);
  return id;
};
URL.revokeObjectURL = () => {};
dom.window.HTMLAnchorElement.prototype.click = function () {
  const blob = blobs.get(this.href);
  if (blob) downloads.push({ name: this.download, blob });
};
const user = userEvent.setup({ document: dom.window.document });
test.beforeEach(async () => {
  await setManyStores({
    ...Object.fromEntries(
      Object.entries(fixture).filter(([, value]) => Array.isArray(value)),
    ),
    activeTimer: null,
  });
  localStorage.setItem("hasSeenTutorial", "true");
});
test.afterEach(() => cleanup());
test.after(() => dom.window.close());
async function boot() {
  render(<App />);
  await screen.findByRole("heading", { name: /Make today count/ });
}

test(
  "legacy localStorage migration, hydration, every collection, JSON backup and refresh stay compatible",
  { timeout: 10000 },
  async () => {
    for (const [key, value] of Object.entries(fixture))
      if (Array.isArray(value))
        localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem("hasSeenTutorial", "true");
    await migrateFromLocalStorage();
    await boot();
    assert.ok(screen.getAllByText("Legacy task").length > 0);
    await user.click(screen.getByRole("button", { name: "Back up" }));
    assert.match(
      downloads.at(-1)!.name,
      /^chronoflow_backup_\d{4}-\d{2}-\d{2}\.json$/,
    );
    const backup = JSON.parse(await downloads.at(-1)!.blob.text());
    assert.equal(backup.version, 1);
    for (const [key, value] of Object.entries(fixture))
      if (Array.isArray(value)) assert.deepEqual(backup[key], value, key);
    assert.equal(localStorage.getItem("tasks"), null);
    cleanup();
    await boot();
    assert.ok(screen.getAllByText("Legacy task").length > 0);
    cleanup();
  },
);

test(
  "new client and task, filtering, list view, status changes, timer and persistence work together",
  { timeout: 10000 },
  async () => {
    await boot();
    await user.click(screen.getByRole("button", { name: "Clients" }));
    await user.click(screen.getByRole("button", { name: "New client" }));
    await user.type(
      screen.getByLabelText("Client name"),
      "Redesign Test Client",
    );
    await user.click(screen.getByRole("button", { name: "Add client" }));
    assert.ok(screen.getByRole("heading", { name: "Redesign Test Client" }));
    await user.click(screen.getByRole("button", { name: /Tasks & tickets/ }));
    await user.click(screen.getByRole("button", { name: "New task" }));
    await user.type(
      screen.getByLabelText("Task name"),
      "Review redesigned workspace",
    );
    await user.selectOptions(
      screen.getByLabelText("Client"),
      within(screen.getByLabelText("Client")).getByRole("option", {
        name: "Redesign Test Client",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Create task" }));
    await user.type(
      screen.getByRole("textbox", { name: "Search tasks" }),
      "Review redesigned",
    );
    assert.ok(
      screen.getByRole("button", { name: "Review redesigned workspace" }),
    );
    assert.equal(screen.queryByRole("button", { name: "Legacy task" }), null);
    await user.click(screen.getByRole("button", { name: "List view" }));
    assert.equal(
      screen
        .getByRole("button", { name: "List view" })
        .getAttribute("aria-pressed"),
      "true",
    );
    await user.selectOptions(
      screen.getByLabelText("Status of Review redesigned workspace"),
      "in-progress",
    );
    await user.click(
      screen.getByRole("button", { name: "Start Review redesigned workspace" }),
    );
    await screen.findByRole("region", { name: "Active time tracker" });
    await user.click(
      screen.getByRole("button", { name: "Finish and save session" }),
    );
    await waitFor(() =>
      assert.equal(
        screen.queryByRole("region", { name: "Active time tracker" }),
        null,
      ),
    );
    await waitFor(async () => {
      const stored = await getAllStores();
      assert.equal(
        (stored.tasks as any[]).find(
          (t) => t.title === "Review redesigned workspace",
        ).status,
        "in-progress",
      );
      assert.equal((stored.sessions as any[]).length, 2);
      const session = (stored.sessions as any[]).at(-1);
      assert.equal(session.endTime - session.startTime, 360000);
    });
    cleanup();
  },
);

test(
  "project and goal navigation, filters, and offline goal creation are functional",
  { timeout: 10000 },
  async () => {
    await boot();
    await user.click(screen.getByRole("button", { name: "Projects" }));
    await user.click(screen.getByRole("button", { name: /Legacy project/ }));
    assert.ok(screen.getByRole("heading", { name: "Legacy project" }));
    await user.click(screen.getByRole("button", { name: "Quarterly goals" }));
    await user.click(screen.getByRole("button", { name: "New goal" }));
    await user.type(
      screen.getByPlaceholderText("I want to..."),
      "Deliver a calmer workspace",
    );
    await user.click(
      screen.getByRole("button", { name: "Create this goal manually" }),
    );
    await user.click(screen.getByRole("button", { name: "Accept & Commit" }));
    assert.ok(
      screen.getByRole("heading", { name: "Deliver a calmer workspace" }),
    );
    cleanup();
  },
);

test(
  "planner exports legacy CSV and supports explicit date selection",
  { timeout: 10000 },
  async () => {
    await boot();
    await user.click(screen.getByRole("button", { name: "My day" }));
    assert.equal(
      (screen.getByLabelText("Choose day") as HTMLInputElement).value,
      dateKey,
    );
    await user.click(screen.getByRole("button", { name: "Export day CSV" }));
    assert.equal(downloads.at(-1)!.name, `timesheet_${dateKey}.csv`);
    const csv = await downloads.at(-1)!.blob.text();
    assert.ok(csv.startsWith("Ticket #,Client,Date,Start,End,Description\n"));
    assert.ok(csv.includes("Existing rich notes"));
    await user.click(screen.getByRole("button", { name: "Previous day" }));
    assert.notEqual(
      (screen.getByLabelText("Choose day") as HTMLInputElement).value,
      dateKey,
    );
    await user.click(screen.getByRole("button", { name: "Export day CSV" }));
    assert.equal(
      await downloads.at(-1)!.blob.text(),
      "Ticket #,Client,Date,Start,End,Description\n",
    );
    cleanup();
  },
);

test(
  "backup merge updates matching IDs, retains other records, and overwrite restores supplied arrays",
  { timeout: 10000 },
  async () => {
    await setManyStores({
      tasks: [
        ...fixture.tasks,
        { ...fixture.tasks[0], id: "local-only", title: "Locally created" },
      ],
    });
    await boot();
    const importInput = screen.getByLabelText("Import ChronoFlow backup");
    const update = {
      ...fixture,
      tasks: [{ ...fixture.tasks[0], title: "Updated from legacy backup" }],
    };
    await user.upload(
      importInput,
      new File([JSON.stringify(update)], "legacy.json", {
        type: "application/json",
      }),
    );
    await screen.findByRole("dialog", { name: "Bring your work with you." });
    await user.click(
      screen.getByRole("button", { name: "Merge with my workspace" }),
    );
    await waitFor(async () => {
      const data = await getAllStores();
      assert.equal((data.tasks as any[]).length, 2);
      assert.equal(
        (data.tasks as any[]).find((t) => t.id === "legacy-task").title,
        "Updated from legacy backup",
      );
    });
    await user.upload(
      importInput,
      new File([JSON.stringify(fixture)], "legacy.json", {
        type: "application/json",
      }),
    );
    await screen.findByRole("dialog", { name: "Bring your work with you." });
    await user.click(
      screen.getByRole("button", { name: "Replace with this backup" }),
    );
    await waitFor(async () => {
      const data = await getAllStores();
      for (const [key, value] of Object.entries(fixture))
        if (Array.isArray(value)) assert.deepEqual(data[key], value, key);
    });
    cleanup();
  },
);

test(
  "first-run workspace offers a direct start and focus sessions work without a task",
  { timeout: 10000 },
  async () => {
    await setManyStores({
      clients: [],
      tasks: [],
      subtasks: [],
      sessions: [],
      projects: [],
      rocks: [],
      plannedActivities: [],
      recurringActivities: [],
      customTemplates: [],
      activeTimer: null,
    });
    localStorage.removeItem("hasSeenTutorial");
    render(<App />);
    await screen.findByRole("button", { name: "Open my workspace" });
    await user.click(screen.getByRole("button", { name: "Open my workspace" }));
    await screen.findByRole("heading", { name: /Make today count/ });
    await user.click(screen.getByRole("button", { name: "Focus space" }));
    await user.click(screen.getByRole("button", { name: "Start focusing" }));
    await screen.findByRole("region", { name: "Active time tracker" });
    await user.click(
      screen.getByRole("button", { name: "Finish and save session" }),
    );
    await screen.findByRole("button", { name: "Stop & Save" });
    await user.click(screen.getByRole("button", { name: "Stop & Save" }));
    await waitFor(() =>
      assert.equal(
        screen.queryByRole("region", { name: "Active time tracker" }),
        null,
      ),
    );
    cleanup();
  },
);

test(
  "search opens the matched time entry and dialog cancellation leaves records intact",
  { timeout: 10000 },
  async () => {
    await boot();
    await user.click(screen.getByRole("button", { name: "Search workspace" }));
    await screen.findByRole("dialog", { name: "Find your way back." });
    await user.type(
      screen.getByRole("textbox", { name: "Search your workspace" }),
      "Existing rich notes",
    );
    await user.click(
      screen.getByRole("button", { name: "Open Time entry: Legacy task" }),
    );
    await screen.findByRole("dialog", { name: /Fine-tune this entry/ });
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    assert.deepEqual((await getAllStores()).sessions, fixture.sessions);
    cleanup();
  },
);

test(
  "an existing active timer survives hydration and remount",
  { timeout: 10000 },
  async () => {
    const timer = { taskId: "legacy-task", startTime: Date.now() - 60000 };
    await setManyStores({ activeTimer: timer });
    await boot();
    await screen.findByRole("region", { name: "Active time tracker" });
    cleanup();
    await boot();
    await screen.findByRole("region", { name: "Active time tracker" });
    assert.deepEqual((await getAllStores()).activeTimer, timer);
    cleanup();
  },
);
