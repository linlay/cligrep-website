import { useEffect, useId, useRef, useState } from "react";
import type { ToolbarMenuItem } from "../types";

interface ToolbarMenuProps {
  label: string;
  value: string;
  items: ToolbarMenuItem[];
  tone?: string;
}

export default function ToolbarMenu({ label, value, items, tone = "default" }: ToolbarMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleSelect(item: ToolbarMenuItem) {
    item.onSelect();
    setOpen(false);
  }

  return (
    <div className={`toolbar-menu toolbar-menu-${tone}`.trim()} ref={rootRef}>
      <button
        type="button"
        className={`toolbar-trigger toolbar-trigger-${tone}`.trim()}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((visible) => !visible)}
      >
        <span className="toolbar-trigger-label">{label}</span>
        <span className="toolbar-trigger-value">{value}</span>
      </button>

      {open ? (
        <div className="toolbar-dropdown" id={menuId} role="menu" aria-label={label}>
          <div className="toolbar-dropdown-title">{label}</div>
          <div className="toolbar-dropdown-list">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`toolbar-option ${item.active ? "active" : ""}`.trim()}
                role={item.role ?? "menuitemradio"}
                aria-checked={item.role === "menuitemradio" || !item.role ? item.active : undefined}
                onClick={() => handleSelect(item)}
              >
                <span className="toolbar-option-check" aria-hidden="true">
                  {item.active ? "x" : " "}
                </span>
                <span className="toolbar-option-text">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
