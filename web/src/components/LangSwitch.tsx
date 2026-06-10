import type { Lang } from "../lib/i18n";
import { cn } from "../lib/utils";

const OPTIONS: { lang: Lang; label: string }[] = [
  { lang: "ja", label: "日本語" },
  { lang: "en", label: "English" },
];

export function LangSwitch({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex overflow-hidden rounded-full border border-white/35"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.lang}
          type="button"
          onClick={() => onChange(o.lang)}
          className={cn(
            "px-3.5 py-1 text-xs font-medium transition-colors",
            "border-l border-white/35 first:border-l-0",
            lang === o.lang ? "bg-white text-brand" : "text-sky-50 hover:bg-white/10",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
