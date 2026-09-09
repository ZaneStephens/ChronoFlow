import ClientOptions from "./ui/ClientOptions";
import React, { useState } from "react";
import {
  Project,
  Client,
  Milestone,
  ProjectRisk,
  ProjectTemplate,
  TimerSession,
} from "../types";
import {
  generateProjectPlan,
  updateProjectPlan,
} from "../services/geminiService";
import {
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Sparkles,
  Loader2,
  ArrowRight,
  LayoutTemplate,
  Briefcase,
  Search,
  ArrowUpRight,
  ChevronRight,
  MoreVertical,
  Trash2,
  X,
  Flag,
  Zap,
  Clock,
  Edit2,
  Save,
  RotateCw,
  Copy,
  Archive,
} from "lucide-react";
import { ToastType } from "./Toast";
import { ConfirmModalConfig } from "./ConfirmModal";

interface ProjectManagerProps {
  projects: Project[];
  clients: Client[];
  sessions?: TimerSession[];
  customTemplates?: ProjectTemplate[];
  onAddProject: (project: Project) => void;
  onUpdateProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onSaveTemplate?: (template: ProjectTemplate) => void;
  onLogTime?: (projectId: string, milestoneId?: string) => void;

  // Notification Props
  showToast: (message: string, type?: ToastType) => void;
  requestConfirm: (
    config: Omit<ConfirmModalConfig, "isOpen" | "onConfirm" | "onCancel"> & {
      onConfirm: () => void;
      onCancel?: () => void;
    },
  ) => void;
}

const DEFAULT_TEMPLATES = [
  {
    title: "Server Migration",
    desc: "Migrate on-prem servers to Cloud/Hybrid",
    prompt:
      "Migrate on-premise Windows Server 2019 file server to Azure Files with Entra ID authentication.",
  },
  {
    title: "M365 Security Audit",
    desc: "Full tenant security review & hardening",
    prompt:
      "Conduct a full Microsoft 365 security audit, implement MFA, conditional access policies, and secure score improvement.",
  },
  {
    title: "Website Overhaul",
    desc: "Redesign and deploy client website",
    prompt:
      "Redesign client corporate website, move to modern hosting, implement SEO basics and analytics.",
  },
  {
    title: "Onboarding Setup",
    desc: "New employee hardware/software provisioning",
    prompt:
      "Standard new user onboarding: Laptop procurement, M365 account creation, Intune enrollment, access rights assignment.",
  },
];

const ProjectManager: React.FC<ProjectManagerProps> = ({
  projects,
  clients,
  sessions = [],
  customTemplates = [],
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onSaveTemplate,
  onLogTime,
  showToast,
  requestConfirm,
}) => {
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [projectQuery, setProjectQuery] = useState("");
  const [projectStatus, setProjectStatus] = useState("all");

  // Creation State
  const [createTab, setCreateTab] = useState<"ai" | "templates">("ai");
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectClient, setNewProjectClient] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<{
    milestones: any[];
    risks: any[];
    description: string;
  } | null>(null);

  // Re-plan State
  const [isReplanning, setIsReplanning] = useState(false);
  const [replanPrompt, setReplanPrompt] = useState("");
  const [isReplanLoading, setIsReplanLoading] = useState(false);

  // Milestone Edit State
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(
    null,
  );
  const [editMilestoneTitle, setEditMilestoneTitle] = useState("");
  const [editMilestoneDate, setEditMilestoneDate] = useState("");

  // Title/Description Edit State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState("");

  // Add Milestone State
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDate, setNewMilestoneDate] = useState("");

  // Risk State
  const [isAddingRisk, setIsAddingRisk] = useState(false);
  const [newRiskTitle, setNewRiskTitle] = useState("");
  const [newRiskImpact, setNewRiskImpact] = useState<"Low" | "Medium" | "High">(
    "Medium",
  );
  const [newRiskMitigation, setNewRiskMitigation] = useState("");
  const [editingRiskId, setEditingRiskId] = useState<string | null>(null);
  const [editRiskTitle, setEditRiskTitle] = useState("");
  const [editRiskImpact, setEditRiskImpact] = useState<
    "Low" | "Medium" | "High"
  >("Medium");
  const [editRiskMitigation, setEditRiskMitigation] = useState("");

  const handleCreateClick = () => {
    setNewProjectTitle("");
    setNewProjectClient("");
    setNewProjectDesc("");
    setAiPrompt("");
    setGeneratedPlan(null);
    setCreateTab("ai");
    setView("create");
  };

  const handleGeneratePlan = async () => {
    if (!aiPrompt || !newProjectClient) return;
    setIsAiGenerating(true);
    const client = clients.find((c) => c.id === newProjectClient);
    const clientName = client?.name || "Client";
    const plan = await generateProjectPlan(
      aiPrompt,
      clientName,
      client?.isInternal || false,
    );
    setGeneratedPlan(plan);
    setNewProjectDesc(plan.description);
    if (!newProjectTitle)
      setNewProjectTitle(
        aiPrompt.length > 50 ? aiPrompt.substring(0, 50) + "..." : aiPrompt,
      );
    setIsAiGenerating(false);
  };

  const applyTemplate = (template: ProjectTemplate) => {
    setNewProjectTitle(template.title);
    setNewProjectDesc(template.description);

    if (template.structure) {
      // Direct structure copy
      setGeneratedPlan({
        description: template.description,
        milestones: template.structure.milestones,
        risks: template.structure.risks,
      });
    } else if (template.prompt) {
      // AI Prompt
      setAiPrompt(template.prompt);
      setCreateTab("ai"); // Switch to AI tab to generate
    }
  };

  const handleFinalizeCreate = () => {
    if (!newProjectTitle || !newProjectClient) return;

    // Defensive mapping
    const milestones: Milestone[] = (generatedPlan?.milestones || []).map(
      (m, idx) => ({
        id: Math.random().toString(36).substr(2, 9),
        title: m.title,
        isCompleted: false,
        dueDate: new Date(Date.now() + m.dueDateOffsetDays * 86400000)
          .toISOString()
          .split("T")[0],
      }),
    );

    const risks: ProjectRisk[] = (generatedPlan?.risks || []).map((r, idx) => ({
      id: Math.random().toString(36).substr(2, 9),
      risk: r.risk,
      impact: r.impact as any,
      mitigation: r.mitigation,
    }));

    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      title: newProjectTitle,
      clientId: newProjectClient,
      description: newProjectDesc,
      status: "planning",
      startDate: new Date().toISOString().split("T")[0],
      milestones,
      risks,
    };

    onAddProject(newProject);
    showToast(`Project "${newProjectTitle}" created via Gemini AI.`, "success");
    setView("list");
  };

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setIsReplanning(false);
    setView("detail");
  };

  const handleDeleteProject = () => {
    if (!selectedProject) return;

    requestConfirm({
      title: "Delete Project?",
      message: `Are you sure you want to delete "${selectedProject.title}"? This action cannot be undone and will remove all associated milestones and risk data.`,
      confirmLabel: "Delete Project",
      variant: "danger",
      onConfirm: () => {
        onDeleteProject(selectedProject.id);
        setView("list");
        setSelectedProject(null);
        showToast("Project deleted successfully.", "info");
      },
    });
  };

  const toggleMilestone = (milestoneId: string) => {
    if (!selectedProject) return;
    const updatedMilestones = selectedProject.milestones.map((m) =>
      m.id === milestoneId ? { ...m, isCompleted: !m.isCompleted } : m,
    );
    const updatedProject = {
      ...selectedProject,
      milestones: updatedMilestones,
    };

    // Auto update status if all done
    if (
      updatedMilestones.length > 0 &&
      updatedMilestones.every((m) => m.isCompleted)
    ) {
      updatedProject.status = "completed";
      showToast(
        "All milestones completed - Project marked as Completed!",
        "success",
      );
    } else if (updatedProject.status === "completed") {
      updatedProject.status = "active";
    }

    onUpdateProject(updatedProject);
    setSelectedProject(updatedProject);
  };

  const handleReplan = async () => {
    if (!selectedProject || !replanPrompt) return;
    setIsReplanLoading(true);

    const completedMilestones = selectedProject.milestones
      .filter((m) => m.isCompleted)
      .map((m) => m.title);
    const client = clients.find((c) => c.id === selectedProject.clientId);

    const result = await updateProjectPlan(
      selectedProject.title,
      selectedProject.description,
      completedMilestones,
      replanPrompt,
      client?.isInternal || false,
    );

    // Merge results
    const existingCompleted = selectedProject.milestones.filter(
      (m) => m.isCompleted,
    );

    const newMilestones: Milestone[] = (result.newMilestones || []).map(
      (m) => ({
        id: Math.random().toString(36).substr(2, 9),
        title: m.title,
        isCompleted: false,
        dueDate: new Date(Date.now() + m.dueDateOffsetDays * 86400000)
          .toISOString()
          .split("T")[0],
      }),
    );

    const newRisks: ProjectRisk[] = (result.newRisks || []).map((r) => ({
      id: Math.random().toString(36).substr(2, 9),
      risk: r.risk,
      impact: r.impact as any,
      mitigation: r.mitigation,
    }));

    const updatedProject: Project = {
      ...selectedProject,
      milestones: [...existingCompleted, ...newMilestones],
      risks: [...(selectedProject.risks || []), ...newRisks],
    };

    onUpdateProject(updatedProject);
    setSelectedProject(updatedProject);
    setIsReplanLoading(false);
    setIsReplanning(false);
    setReplanPrompt("");
    showToast("Project plan updated dynamically.", "success");
  };

  const handleSaveAsTemplate = () => {
    if (!selectedProject || !onSaveTemplate) return;

    const template: ProjectTemplate = {
      id: Math.random().toString(36).substr(2, 9),
      title: selectedProject.title + " (Template)",
      description: selectedProject.description,
      structure: {
        milestones: selectedProject.milestones.map((m) => ({
          title: m.title,
          dueDateOffsetDays: 7,
        })), // Approximate offset
        risks: selectedProject.risks,
      },
    };
    onSaveTemplate(template);
    showToast("Project saved as template library.", "success");
  };

  const startEditMilestone = (m: Milestone) => {
    setEditingMilestoneId(m.id);
    setEditMilestoneTitle(m.title);
    setEditMilestoneDate(m.dueDate || "");
  };

  const saveEditMilestone = () => {
    if (!selectedProject || !editingMilestoneId) return;
    const updatedMilestones = selectedProject.milestones.map((m) =>
      m.id === editingMilestoneId
        ? { ...m, title: editMilestoneTitle, dueDate: editMilestoneDate }
        : m,
    );
    const updatedProject = {
      ...selectedProject,
      milestones: updatedMilestones,
    };
    onUpdateProject(updatedProject);
    setSelectedProject(updatedProject);
    setEditingMilestoneId(null);
  };

  // --- Edit Title/Description Handlers ---
  const startEditTitle = () => {
    if (!selectedProject) return;
    setEditTitle(selectedProject.title);
    setIsEditingTitle(true);
  };

  const saveTitle = () => {
    if (!selectedProject || !editTitle.trim()) return;
    const updated = { ...selectedProject, title: editTitle.trim() };
    onUpdateProject(updated);
    setSelectedProject(updated);
    setIsEditingTitle(false);
  };

  const startEditDescription = () => {
    if (!selectedProject) return;
    setEditDescription(selectedProject.description);
    setIsEditingDescription(true);
  };

  const saveDescription = () => {
    if (!selectedProject) return;
    const updated = { ...selectedProject, description: editDescription };
    onUpdateProject(updated);
    setSelectedProject(updated);
    setIsEditingDescription(false);
  };

  // --- Milestone Add/Delete Handlers ---
  const handleAddMilestone = () => {
    if (!selectedProject || !newMilestoneTitle.trim()) return;
    const newMilestone: Milestone = {
      id: Math.random().toString(36).substr(2, 9),
      title: newMilestoneTitle.trim(),
      dueDate: newMilestoneDate || undefined,
      isCompleted: false,
    };
    const updated = {
      ...selectedProject,
      milestones: [...selectedProject.milestones, newMilestone],
    };
    onUpdateProject(updated);
    setSelectedProject(updated);
    setNewMilestoneTitle("");
    setNewMilestoneDate("");
    setIsAddingMilestone(false);
  };

  const handleDeleteMilestone = (
    milestoneId: string,
    milestoneTitle: string,
  ) => {
    if (!selectedProject) return;
    requestConfirm({
      title: "Delete Milestone?",
      message: `Are you sure you want to delete "${milestoneTitle}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
      onConfirm: () => {
        const updated = {
          ...selectedProject,
          milestones: selectedProject.milestones.filter(
            (m) => m.id !== milestoneId,
          ),
        };
        onUpdateProject(updated);
        setSelectedProject(updated);
      },
    });
  };

  // --- Risk Handlers ---
  const handleAddRisk = () => {
    if (!selectedProject || !newRiskTitle.trim()) return;
    const newRisk: ProjectRisk = {
      id: Math.random().toString(36).substr(2, 9),
      risk: newRiskTitle.trim(),
      impact: newRiskImpact,
      mitigation: newRiskMitigation,
    };
    const updated = {
      ...selectedProject,
      risks: [...(selectedProject.risks || []), newRisk],
    };
    onUpdateProject(updated);
    setSelectedProject(updated);
    setNewRiskTitle("");
    setNewRiskImpact("Medium");
    setNewRiskMitigation("");
    setIsAddingRisk(false);
  };

  const startEditRisk = (risk: ProjectRisk) => {
    setEditingRiskId(risk.id);
    setEditRiskTitle(risk.risk);
    setEditRiskImpact(risk.impact);
    setEditRiskMitigation(risk.mitigation);
  };

  const saveEditRisk = () => {
    if (!selectedProject || !editingRiskId) return;
    const updatedRisks = (selectedProject.risks || []).map((r) =>
      r.id === editingRiskId
        ? {
            ...r,
            risk: editRiskTitle,
            impact: editRiskImpact,
            mitigation: editRiskMitigation,
          }
        : r,
    );
    const updated = { ...selectedProject, risks: updatedRisks };
    onUpdateProject(updated);
    setSelectedProject(updated);
    setEditingRiskId(null);
  };

  const handleDeleteRisk = (riskId: string, riskTitle: string) => {
    if (!selectedProject) return;
    requestConfirm({
      title: "Delete Risk?",
      message: `Are you sure you want to delete the risk "${riskTitle}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
      onConfirm: () => {
        const updated = {
          ...selectedProject,
          risks: (selectedProject.risks || []).filter((r) => r.id !== riskId),
        };
        onUpdateProject(updated);
        setSelectedProject(updated);
      },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planning":
        return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      case "active":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
      case "on-hold":
        return "bg-amber-500/20 text-amber-400 border-amber-500/50";
      case "completed":
        return "bg-inset text-muted border-line";
      default:
        return "bg-inset text-body";
    }
  };

  const getTotalHours = (projectId: string) => {
    const projSessions = sessions.filter((s) => s.projectId === projectId);
    const totalSec = projSessions.reduce(
      (acc, s) => acc + ((s.endTime || Date.now()) - s.startTime) / 1000,
      0,
    );
    return (totalSec / 3600).toFixed(1);
  };

  // --- Views ---

  const renderCreate = () => (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">Create New Project</h2>
          <p className="text-muted">
            Initialize a new project manually or use the AI Architect.
          </p>
        </div>
        <button
          onClick={() => setView("list")}
          className="p-2 hover:bg-surface rounded-full text-muted"
        >
          <X />
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-4 bg-surface/50 p-6 rounded-xl border border-line">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                Client
              </label>
              <select
                value={newProjectClient}
                onChange={(e) => setNewProjectClient(e.target.value)}
                className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-ink"
              >
                <option value="">Select Client...</option>
                <ClientOptions clients={clients} />
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                Project Name
              </label>
              <input
                type="text"
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-ink"
                placeholder="e.g. Q3 Infrastructure Upgrade"
              />
            </div>
          </div>

          <div className="bg-canvas border border-indigo-500/30 rounded-xl p-6 relative overflow-hidden min-h-[300px]">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Sparkles size={100} />
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-line mb-4 relative z-10">
              <button
                onClick={() => setCreateTab("ai")}
                className={`pb-2 text-sm font-bold transition-colors ${createTab === "ai" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-quiet hover:text-ink"}`}
              >
                AI Architect
              </button>
              <button
                onClick={() => setCreateTab("templates")}
                className={`pb-2 text-sm font-bold transition-colors ${createTab === "templates" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-quiet hover:text-ink"}`}
              >
                Templates
              </button>
            </div>

            {createTab === "ai" ? (
              <div className="space-y-4 relative z-10">
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full bg-surface border border-line rounded-lg p-3 text-ink h-24 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Describe the project goal (e.g., 'Migrate 50 users to O365 from Exchange 2013')..."
                />
                <button
                  onClick={handleGeneratePlan}
                  disabled={isAiGenerating || !newProjectClient || !aiPrompt}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-ink font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  {isAiGenerating ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Zap size={18} fill="currentColor" />
                  )}
                  Generate Plan & Risk Analysis
                </button>
              </div>
            ) : (
              <div className="space-y-3 relative z-10 h-64 overflow-y-auto pr-2">
                {customTemplates.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-quiet uppercase">
                      My Templates
                    </h4>
                    {customTemplates.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => applyTemplate(t)}
                        className="w-full text-left p-2 rounded bg-surface hover:bg-inset border border-line flex flex-col gap-1 transition-colors"
                      >
                        <span className="text-sm font-medium text-ink">
                          {t.title}
                        </span>
                        <span className="text-xs text-muted truncate">
                          {t.description}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-quiet uppercase">
                    System Templates
                  </h4>
                  {DEFAULT_TEMPLATES.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setAiPrompt(t.prompt);
                        setCreateTab("ai");
                      }}
                      className="w-full text-left p-2 rounded bg-surface hover:bg-inset border border-line flex flex-col gap-1 transition-colors"
                    >
                      <span className="text-sm font-medium text-ink">
                        {t.title}
                      </span>
                      <span className="text-xs text-muted truncate">
                        {t.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-surface border border-line rounded-xl p-6 flex flex-col h-full">
          <h3 className="text-lg font-bold text-ink mb-4">Project Preview</h3>
          {generatedPlan ? (
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              <div>
                <h4 className="text-xs font-bold text-quiet uppercase tracking-wider mb-2">
                  Description
                </h4>
                <p className="text-sm text-body leading-relaxed bg-canvas/50 p-3 rounded-lg border border-line/50">
                  {generatedPlan.description}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-quiet uppercase tracking-wider mb-2">
                  Suggested Milestones
                </h4>
                <div className="space-y-2">
                  {(generatedPlan.milestones || []).map((m, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2 rounded bg-canvas/30 border border-line/50"
                    >
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-ink">
                          {m.title}
                        </p>
                        <p className="text-xs text-quiet">
                          Day {m.dueDateOffsetDays}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!generatedPlan.milestones ||
                    generatedPlan.milestones.length === 0) && (
                    <p className="text-quiet text-sm italic">
                      No milestones generated.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-quiet uppercase tracking-wider mb-2">
                  Risk Radar
                </h4>
                <div className="grid gap-2">
                  {(generatedPlan.risks || []).map((r, i) => (
                    <div
                      key={i}
                      className="p-3 rounded bg-red-500/5 border border-red-500/20"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-bold text-red-400">
                          {r.risk}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${r.impact === "High" ? "bg-red-500 text-ink" : "bg-inset text-body"}`}
                        >
                          {r.impact}
                        </span>
                      </div>
                      <p className="text-xs text-muted italic">
                        Mitigation: {r.mitigation}
                      </p>
                    </div>
                  ))}
                  {(!generatedPlan.risks ||
                    generatedPlan.risks.length === 0) && (
                    <p className="text-quiet text-sm italic">
                      No risks generated.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-quiet space-y-4">
              <LayoutTemplate size={48} className="opacity-20" />
              <p className="text-sm text-center max-w-xs">
                Use the AI Architect to generate a comprehensive plan, or fill
                out the details manually.
              </p>
            </div>
          )}

          <div className="pt-6 mt-6 border-t border-line flex justify-end gap-3">
            <button
              onClick={() => setView("list")}
              className="px-4 py-2 text-body hover:text-ink"
            >
              Cancel
            </button>
            <button
              onClick={handleFinalizeCreate}
              disabled={!newProjectTitle || !newProjectClient}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-ink font-bold rounded-lg shadow-lg"
            >
              Create Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDetail = () => {
    if (!selectedProject) return null;
    const client = clients.find((c) => c.id === selectedProject.clientId);
    const milestones = selectedProject.milestones || [];
    const completedMilestones = milestones.filter((m) => m.isCompleted).length;
    const progress =
      milestones.length > 0
        ? Math.round((completedMilestones / milestones.length) * 100)
        : 0;

    return (
      <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
        <button
          onClick={() => setView("list")}
          className="text-sm text-muted hover:text-ink flex items-center gap-1 mb-4"
        >
          <ChevronRight className="rotate-180" size={16} /> Back to Projects
        </button>

        {/* Header */}
        <div className="bg-surface border border-line rounded-xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded bg-inset text-body uppercase tracking-wider"
                  style={{ color: client?.color }}
                >
                  {client?.name}
                </span>
                <select
                  value={selectedProject.status}
                  onChange={(e) => {
                    const updated = {
                      ...selectedProject,
                      status: e.target.value as any,
                    };
                    onUpdateProject(updated);
                    setSelectedProject(updated);
                  }}
                  className={`text-xs font-bold px-2 py-0.5 rounded border uppercase tracking-wider cursor-pointer outline-none focus:ring-1 focus:ring-white/50 ${getStatusColor(selectedProject.status)}`}
                >
                  <option value="planning" className="bg-surface text-blue-400">
                    Planning
                  </option>
                  <option
                    value="active"
                    className="bg-surface text-emerald-400"
                  >
                    Active
                  </option>
                  <option value="on-hold" className="bg-surface text-amber-400">
                    On Hold
                  </option>
                  <option value="completed" className="bg-surface text-muted">
                    Completed
                  </option>
                </select>
                <span className="text-xs font-mono text-muted flex items-center gap-1">
                  <Clock size={12} /> {getTotalHours(selectedProject.id)}h
                  Logged
                </span>
              </div>
              {/* Editable Title */}
              {isEditingTitle ? (
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 bg-canvas border border-line rounded-lg px-3 py-2 text-2xl font-bold text-ink outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                  <button
                    onClick={saveTitle}
                    className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20 rounded-lg"
                  >
                    <Save size={18} />
                  </button>
                  <button
                    onClick={() => setIsEditingTitle(false)}
                    className="p-2 text-quiet hover:text-red-400 rounded-lg"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="group/title flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold text-ink">
                    {selectedProject.title}
                  </h1>
                  <button
                    onClick={startEditTitle}
                    className="p-1.5 text-quiet hover:text-ink opacity-0 group-hover/title:opacity-100 transition-opacity rounded hover:bg-inset"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              )}
              {/* Editable Description */}
              {isEditingDescription ? (
                <div className="flex items-start gap-2">
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="flex-1 bg-canvas border border-line rounded-lg px-3 py-2 text-body outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    rows={2}
                    autoFocus
                  />
                  <button
                    onClick={saveDescription}
                    className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20 rounded-lg"
                  >
                    <Save size={18} />
                  </button>
                  <button
                    onClick={() => setIsEditingDescription(false)}
                    className="p-2 text-quiet hover:text-red-400 rounded-lg"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="group/desc flex items-start gap-2">
                  <p className="text-muted max-w-2xl">
                    {selectedProject.description}
                  </p>
                  <button
                    onClick={startEditDescription}
                    className="p-1.5 text-quiet hover:text-ink opacity-0 group-hover/desc:opacity-100 transition-opacity rounded hover:bg-inset shrink-0"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-3">
              <div className="flex gap-2 mb-2">
                <button
                  onClick={handleSaveAsTemplate}
                  className="text-xs flex items-center gap-1 bg-inset hover:bg-slate-600 text-ink px-3 py-1.5 rounded transition-colors"
                >
                  <Copy size={12} /> Save as Template
                </button>
                <button
                  onClick={() => setIsReplanning(!isReplanning)}
                  className="text-xs flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-ink px-3 py-1.5 rounded transition-colors shadow-lg shadow-indigo-900/20"
                >
                  <RotateCw size={12} /> Re-plan
                </button>
                <button
                  onClick={handleDeleteProject}
                  className="text-xs flex items-center gap-1 bg-red-900/20 hover:bg-red-900/50 text-red-400 border border-red-900/30 px-3 py-1.5 rounded transition-colors"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-ink mb-1">
                  {progress}%
                </div>
                <p className="text-xs text-quiet uppercase tracking-wider">
                  Completion
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-8 h-2 bg-inset rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Re-planning UI */}
        {isReplanning && (
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-6 animate-in fade-in slide-in-from-top-2">
            <h3 className="text-lg font-bold text-ink flex items-center gap-2 mb-4">
              <Sparkles size={20} className="text-indigo-400" /> AI Re-planner
            </h3>
            <p className="text-sm text-muted mb-4">
              Describe the roadblock, budget cut, or scope change. Gemini will
              restructure the future milestones while preserving completed work.
            </p>
            <div className="flex gap-4">
              <input
                type="text"
                value={replanPrompt}
                onChange={(e) => setReplanPrompt(e.target.value)}
                className="flex-1 bg-canvas border border-line rounded-lg px-4 py-2 text-ink outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Budget cut by 20%, need to simplify the migration..."
              />
              <button
                onClick={handleReplan}
                disabled={isReplanLoading || !replanPrompt}
                className="bg-indigo-600 hover:bg-indigo-700 text-ink px-6 py-2 rounded-lg font-bold disabled:opacity-50 flex items-center gap-2"
              >
                {isReplanLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Zap size={18} />
                )}{" "}
                Update Plan
              </button>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Milestones */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <Flag className="text-indigo-400" size={20} /> Milestones
              </h3>
              <button
                onClick={() => setIsAddingMilestone(true)}
                className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-3 py-1.5 hover:bg-indigo-900/20 rounded-lg transition-colors"
              >
                <Plus size={16} /> Add Milestone
              </button>
            </div>
            <div className="bg-surface border border-line rounded-xl overflow-hidden">
              {milestones.map((m, i) => {
                const isEditing = editingMilestoneId === m.id;
                return (
                  <div
                    key={m.id}
                    className={`group p-4 flex items-center gap-4 border-b border-line/50 last:border-0 hover:bg-inset/30 transition-colors ${m.isCompleted ? "bg-surface/50" : ""}`}
                  >
                    <button
                      onClick={() => toggleMilestone(m.id)}
                      className={`shrink-0 transition-colors ${m.isCompleted ? "text-emerald-500" : "text-quiet hover:text-ink"}`}
                    >
                      {m.isCompleted ? (
                        <CheckCircle2 size={24} />
                      ) : (
                        <Circle size={24} />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={editMilestoneTitle}
                            onChange={(e) =>
                              setEditMilestoneTitle(e.target.value)
                            }
                            className="bg-canvas border border-line rounded px-2 py-1 text-ink text-sm flex-1"
                          />
                          <input
                            type="date"
                            value={editMilestoneDate}
                            onChange={(e) =>
                              setEditMilestoneDate(e.target.value)
                            }
                            className="bg-canvas border border-line rounded px-2 py-1 text-ink text-sm"
                          />
                          <button
                            onClick={saveEditMilestone}
                            className="text-emerald-400 hover:text-emerald-300"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                          <button
                            onClick={() => setEditingMilestoneId(null)}
                            className="text-quiet hover:text-red-400"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h4
                            className={`font-medium truncate ${m.isCompleted ? "text-muted line-through" : "text-ink"}`}
                          >
                            {m.title}
                          </h4>
                          <p className="text-xs text-quiet flex items-center gap-1 mt-0.5">
                            <Calendar size={12} /> Due: {m.dueDate || "Not set"}
                          </p>
                        </>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!m.isCompleted && (
                          <button
                            onClick={() => startEditMilestone(m)}
                            className="p-1.5 text-muted hover:text-ink rounded hover:bg-inset"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        <button
                          onClick={() =>
                            onLogTime && onLogTime(selectedProject.id, m.id)
                          }
                          className="p-1.5 text-muted hover:text-indigo-400 rounded hover:bg-inset"
                          title="Log Time"
                        >
                          <Clock size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteMilestone(m.id, m.title)}
                          className="p-1.5 text-muted hover:text-red-400 rounded hover:bg-red-900/20"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add Milestone Input */}
              {isAddingMilestone && (
                <div className="p-4 flex items-center gap-3 bg-canvas/50 border-t border-line/50">
                  <Circle size={24} className="text-quiet shrink-0" />
                  <input
                    type="text"
                    value={newMilestoneTitle}
                    onChange={(e) => setNewMilestoneTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddMilestone()}
                    className="flex-1 bg-surface border border-line rounded px-3 py-1.5 text-ink outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Milestone title..."
                    autoFocus
                  />
                  <input
                    type="date"
                    value={newMilestoneDate}
                    onChange={(e) => setNewMilestoneDate(e.target.value)}
                    className="bg-surface border border-line rounded px-2 py-1.5 text-ink"
                  />
                  <button
                    onClick={handleAddMilestone}
                    disabled={!newMilestoneTitle.trim()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-ink rounded font-medium"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingMilestone(false);
                      setNewMilestoneTitle("");
                      setNewMilestoneDate("");
                    }}
                    className="p-1.5 text-quiet hover:text-red-400"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              {milestones.length === 0 && !isAddingMilestone && (
                <div className="p-4 text-center text-quiet italic">
                  No milestones defined.
                </div>
              )}
            </div>
          </div>

          {/* Risks & Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                  <AlertTriangle className="text-red-400" size={20} /> Risk
                  Assessment
                </h3>
                <button
                  onClick={() => setIsAddingRisk(true)}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-2 py-1 hover:bg-red-900/20 rounded transition-colors"
                >
                  <Plus size={14} /> Add Risk
                </button>
              </div>
              <div className="space-y-3">
                {(selectedProject.risks || []).map((r) => {
                  const isEditing = editingRiskId === r.id;
                  return (
                    <div
                      key={r.id}
                      className="group bg-surface border-l-4 border-red-500/50 rounded-r-lg p-4"
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editRiskTitle}
                            onChange={(e) => setEditRiskTitle(e.target.value)}
                            className="w-full bg-canvas border border-line rounded px-2 py-1 text-ink text-sm"
                            placeholder="Risk title..."
                          />
                          <div className="flex gap-2">
                            <select
                              value={editRiskImpact}
                              onChange={(e) =>
                                setEditRiskImpact(e.target.value as any)
                              }
                              className="bg-canvas border border-line rounded px-2 py-1 text-ink text-xs"
                            >
                              <option value="Low">Low</option>
                              <option value="Medium">Medium</option>
                              <option value="High">High</option>
                            </select>
                            <input
                              type="text"
                              value={editRiskMitigation}
                              onChange={(e) =>
                                setEditRiskMitigation(e.target.value)
                              }
                              className="flex-1 bg-canvas border border-line rounded px-2 py-1 text-ink text-xs"
                              placeholder="Mitigation..."
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              onClick={saveEditRisk}
                              className="text-xs px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-ink rounded"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingRiskId(null)}
                              className="text-xs px-2 py-1 text-muted hover:text-ink"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="text-sm font-bold text-ink">
                              {r.risk}
                            </h4>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] uppercase font-bold ${r.impact === "High" ? "text-red-400" : r.impact === "Medium" ? "text-amber-400" : "text-muted"}`}
                              >
                                {r.impact}
                              </span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => startEditRisk(r)}
                                  className="p-1 text-muted hover:text-ink"
                                  title="Edit"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={() => handleDeleteRisk(r.id, r.risk)}
                                  className="p-1 text-muted hover:text-red-400"
                                  title="Delete"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-muted">{r.mitigation}</p>
                        </>
                      )}
                    </div>
                  );
                })}

                {/* Add Risk Form */}
                {isAddingRisk && (
                  <div className="bg-surface border border-red-500/30 rounded-lg p-4 space-y-2">
                    <input
                      type="text"
                      value={newRiskTitle}
                      onChange={(e) => setNewRiskTitle(e.target.value)}
                      className="w-full bg-canvas border border-line rounded px-2 py-1.5 text-ink text-sm"
                      placeholder="Risk title..."
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <select
                        value={newRiskImpact}
                        onChange={(e) =>
                          setNewRiskImpact(e.target.value as any)
                        }
                        className="bg-canvas border border-line rounded px-2 py-1 text-ink text-xs"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                      <input
                        type="text"
                        value={newRiskMitigation}
                        onChange={(e) => setNewRiskMitigation(e.target.value)}
                        className="flex-1 bg-canvas border border-line rounded px-2 py-1 text-ink text-xs"
                        placeholder="Mitigation strategy..."
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={handleAddRisk}
                        disabled={!newRiskTitle.trim()}
                        className="text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-ink rounded font-medium"
                      >
                        Add Risk
                      </button>
                      <button
                        onClick={() => {
                          setIsAddingRisk(false);
                          setNewRiskTitle("");
                          setNewRiskMitigation("");
                        }}
                        className="text-xs px-2 py-1.5 text-muted hover:text-ink"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {(!selectedProject.risks ||
                  selectedProject.risks.length === 0) &&
                  !isAddingRisk && (
                    <p className="text-sm text-quiet italic">
                      No risks identified.
                    </p>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderList = () => {
    const visible = projects.filter(
      (p) =>
        (projectStatus === "all" || p.status === projectStatus) &&
        `${p.title} ${clients.find((c) => c.id === p.clientId)?.name || ""}`
          .toLowerCase()
          .includes(projectQuery.toLowerCase()),
    );
    return (
      <div>
        <div className="page-heading">
          <div>
            <p className="eyebrow">ROOM FOR THE BIGGER IDEAS</p>
            <h1>Move something meaningful.</h1>
            <p>Keep the milestones, people and next steps in one place.</p>
          </div>
          <button className="button primary" onClick={handleCreateClick}>
            <Plus size={17} /> New project
          </button>
        </div>
        <div className="portfolio-summary">
          <div>
            <strong>
              {projects.filter((p) => p.status === "active").length}
            </strong>
            <span>Active projects</span>
          </div>
          <div>
            <strong>
              {projects.reduce(
                (n, p) =>
                  n + (p.milestones || []).filter((m) => !m.isCompleted).length,
                0,
              )}
            </strong>
            <span>Milestones ahead</span>
          </div>
          <div>
            <strong>
              {projects.filter((p) => p.status === "completed").length}
            </strong>
            <span>Across the finish line</span>
          </div>
        </div>
        <div className="task-toolbar">
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Search projects"
              value={projectQuery}
              onChange={(e) => setProjectQuery(e.target.value)}
              placeholder="Find a project or client…"
            />
          </label>
          <select
            aria-label="Filter projects by status"
            value={projectStatus}
            onChange={(e) => setProjectStatus(e.target.value)}
          >
            <option value="all">All projects</option>
            <option value="active">Active</option>
            <option value="planning">Planning</option>
            <option value="on-hold">On hold</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div className="project-grid">
          {visible.map((project) => {
            const client = clients.find((c) => c.id === project.clientId);
            const milestones = project.milestones || [];
            const completed = milestones.filter((m) => m.isCompleted).length;
            const percent = milestones.length
              ? Math.round((completed / milestones.length) * 100)
              : 0;
            const next = milestones.find((m) => !m.isCompleted);
            return (
              <button
                className="project-card"
                key={project.id}
                onClick={() => handleProjectClick(project)}
              >
                <div className="project-card-meta">
                  <span className="client-label">
                    <i
                      className="client-dot"
                      style={{ background: client?.color || "#799267" }}
                    />
                    {client?.name || "Unassigned client"}
                  </span>
                  <span
                    className={`status-pill ${project.status === "active" ? "in-progress" : ""}`}
                  >
                    {project.status.replace("-", " ")}
                  </span>
                </div>
                <h2>{project.title}</h2>
                <p>
                  {project.description ||
                    "A new initiative, ready to take shape."}
                </p>
                <div className="project-progress-label">
                  <span>
                    {completed} of {milestones.length} milestones
                  </span>
                  <strong>{percent}%</strong>
                </div>
                <div className="project-progress">
                  <span style={{ width: `${percent}%` }} />
                </div>
                <div className="project-next">
                  <span>
                    <small>UP NEXT</small>
                    <strong>
                      {next?.title ||
                        (milestones.length
                          ? "All milestones complete"
                          : "Add your first milestone")}
                    </strong>
                  </span>
                  <ArrowUpRight size={18} />
                </div>
                {project.dueDate && (
                  <span className="project-due">
                    <Calendar size={13} /> Due{" "}
                    {new Date(project.dueDate + "T12:00:00").toLocaleDateString(
                      "en-AU",
                      { day: "numeric", month: "short", year: "numeric" },
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {!visible.length && (
          <div className="empty-state">
            <Briefcase size={30} />
            <h3>
              {projects.length
                ? "Nothing matches just yet."
                : "Big things start with a first step."}
            </h3>
            <p>
              {projects.length
                ? "Try another search or status."
                : "Create a project and give your next initiative some direction."}
            </p>
            {!projects.length && (
              <button className="button secondary" onClick={handleCreateClick}>
                Create a project <Plus size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="project-manager" className="p-6 pb-20">
      {view === "list" && renderList()}
      {view === "create" && renderCreate()}
      {view === "detail" && renderDetail()}
    </div>
  );
};

export default ProjectManager;
