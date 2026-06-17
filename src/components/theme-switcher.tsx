import { Check, Moon, Sun, Waves } from "lucide-react";

const themes = [
  { id: "light", label: "Claro", icon: Sun },
  { id: "dark", label: "Escuro", icon: Moon },
  { id: "navy", label: "Azul", icon: Waves },
];

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`theme-switcher ${compact ? "theme-switcher-compact" : ""}`} role="group" aria-label="Tema da interface">
      {themes.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          data-theme-choice={id}
          className="theme-option"
          aria-pressed={id === "light"}
          title={`Usar tema ${label.toLowerCase()}`}
        >
          <Icon aria-hidden="true" />
          {!compact ? <span>{label}</span> : null}
          <Check className="theme-check" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
