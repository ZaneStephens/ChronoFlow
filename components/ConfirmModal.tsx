import React from "react";
import Dialog from "./ui/Dialog";
export interface ConfirmModalConfig {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}
export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalConfig) {
  if (!isOpen) return null;
  return (
    <Dialog title={title} onClose={onCancel}>
      <p className="dialog-description">{message}</p>
      <div className="dialog-actions">
        <button autoFocus className="button secondary" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          className={`button ${variant === "danger" ? "destructive" : "primary"}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
