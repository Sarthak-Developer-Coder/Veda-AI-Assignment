import {
  Clipboard,
  FileText,
  LayoutGrid,
  MonitorPlay,
  PanelLeft,
  PieChart,
  Sparkles,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Home", icon: LayoutGrid },
  { label: "My Classroom", icon: MonitorPlay },
  { label: "Assignments", icon: FileText },
  { label: "Exams", icon: Clipboard, active: true },
  { label: "My Library", icon: PieChart },
];

function Brand() {
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-ink">
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden>
        <path d="M4 5h5l3 9 3-9h5l-6.2 15h-3.6z" fill="white" />
      </svg>
    </div>
  );
}

export function VedaSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col rounded-[22px] bg-card p-3 shadow-card transition-[width] duration-300 md:flex",
        collapsed ? "w-[68px]" : "w-[248px]",
      )}
    >
      <div className={cn("flex items-center gap-2 px-1 py-2", collapsed && "justify-center")}>
        <Brand />
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-[19px] font-bold tracking-tight text-ink">
              VedaAI
            </span>
            <button
              onClick={onToggle}
              aria-label="Collapse sidebar"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-ink"
            >
              <PanelLeft className="h-[18px] w-[18px]" />
            </button>
          </>
        )}
      </div>

      <button
        className={cn(
          "mt-4 flex items-center justify-center gap-2 rounded-full bg-ink text-[13.5px] font-semibold text-primary-foreground ring-2 ring-brand/70 ring-offset-2 ring-offset-card transition-transform hover:scale-[1.02]",
          collapsed ? "mx-auto h-10 w-10" : "h-11 w-full px-4",
        )}
      >
        <Sparkles className="h-4 w-4 text-brand" />
        {!collapsed && <span>AI Teacher&apos;s Toolkit</span>}
      </button>

      <nav className={cn("mt-7 flex flex-col gap-1", collapsed && "items-center")}>
        {nav.map((item) => (
          <button
            key={item.label}
            className={cn(
              "flex items-center gap-3 rounded-xl text-[14px] font-medium transition-colors",
              collapsed ? "h-10 w-10 justify-center" : "h-11 w-full px-3",
              item.active
                ? "bg-secondary font-semibold text-ink"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-ink",
            )}
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="mt-auto">
        {collapsed ? (
          <div className="flex flex-col items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-[11px] font-bold text-success">
              DPS
            </div>
            <button
              onClick={onToggle}
              aria-label="Expand sidebar"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-ink"
            >
              <ChevronsRight className="h-[18px] w-[18px]" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl bg-secondary/70 p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card text-[10px] font-bold text-success shadow-sm">
              DPS
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-ink">Delhi Public School</p>
              <p className="truncate text-[12px] text-muted-foreground">Bokaro Steel City</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export function MobileTopBrand() {
  return (
    <div className="flex items-center gap-2">
      <Brand />
      <span className="text-[17px] font-bold tracking-tight text-ink">VedaAI</span>
    </div>
  );
}
