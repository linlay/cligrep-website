import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

interface PaletteCommand {
  name: string;
  desc: string;
}

interface CommandPaletteProps {
  onClose: () => void;
  onExecute: (command: string) => void;
}

export default function CommandPalette({ onClose, onExecute }: CommandPaletteProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: PaletteCommand[] = [
    { name: "theme dark", desc: "Switch to dark theme" },
    { name: "theme light", desc: "Switch to light theme" },
    { name: "theme system", desc: "Switch to system theme" },
    { name: "lang en", desc: "Switch to English" },
    { name: "lang zh", desc: "Switch to Chinese" },
    { name: "login", desc: "Mock login" },
    { name: "logout", desc: "Log out" },
    { name: "clear", desc: "Clear terminal" },
    { name: "help", desc: "Show help" },
  ];

  const filtered = commands.filter(
    (cmd) => cmd.name.includes(filter.toLowerCase()) || cmd.desc.toLowerCase().includes(filter.toLowerCase()),
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (filtered[selectedIndex]) {
        onExecute(filtered[selectedIndex].name);
        onClose();
      }
    }
  }

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="command-palette-input"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("cmd_palette_placeholder")}
          spellCheck={false}
        />
        <div className="command-palette-list">
          {filtered.map((cmd, i) => (
            <button
              key={cmd.name}
              type="button"
              className={`command-palette-item ${i === selectedIndex ? "active" : ""}`}
              onClick={() => {
                onExecute(cmd.name);
                onClose();
              }}
            >
              <span className="cmd-name">{cmd.name}</span>
              <span className="cmd-desc">{cmd.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
