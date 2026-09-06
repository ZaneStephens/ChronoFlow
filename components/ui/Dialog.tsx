import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
interface DialogProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}
/** Native modal semantics provide focus containment and a keyboard-accessible escape route. */
export default function Dialog({
  title,
  onClose,
  children,
  className = "",
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`workspace-dialog ${className}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
