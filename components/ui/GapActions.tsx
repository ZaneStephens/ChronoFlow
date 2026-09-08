import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Play, CheckSquare } from "lucide-react";

/** Portal escapes both entry stacking contexts and the timeline's scroll clipping. */
export default function GapActions({
  anchor,
  onClose,
  onLog,
  onStart,
}: {
  anchor: HTMLButtonElement;
  onClose: () => void;
  onLog: () => void;
  onStart?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  useLayoutEffect(() => {
    const rect = anchor.getBoundingClientRect();
    const height = ref.current?.offsetHeight || 100;
    const width = ref.current?.offsetWidth || 192;
    setPosition({
      left: Math.max(
        8,
        Math.min(
          rect.left + rect.width / 2 - width / 2,
          window.innerWidth - width - 8,
        ),
      ),
      top: Math.max(
        8,
        rect.bottom + height + 8 <= window.innerHeight
          ? rect.bottom + 6
          : rect.top - height - 6,
      ),
    });
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      if (anchor.isConnected) anchor.focus({ preventScroll: true });
    };
  }, [anchor]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (
        !ref.current?.contains(event.target as Node) &&
        !anchor.contains(event.target as Node)
      )
        onClose();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    const scroll = (event: Event) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    window.addEventListener("resize", onClose);
    document.addEventListener("scroll", scroll, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
      window.removeEventListener("resize", onClose);
      document.removeEventListener("scroll", scroll, true);
    };
  }, [anchor, onClose]);
  return createPortal(
    <div
      ref={ref}
      id="gap-actions"
      role="group"
      aria-label="Fill gap actions"
      className="gap-actions"
      style={position}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          onClose();
      }}
    >
      {onStart && (
        <button
          onClick={() => {
            onClose();
            onStart();
          }}
        >
          <Play size={15} /> Start Timer
        </button>
      )}
      <button
        onClick={() => {
          onClose();
          onLog();
        }}
      >
        <CheckSquare size={15} /> Manual Log
      </button>
    </div>,
    document.body,
  );
}
