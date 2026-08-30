import { ArrowLeft, Bell, ChevronDown, Clipboard, HelpCircle, Menu, Sparkles } from "lucide-react";
import { MobileTopBrand } from "./Sidebar";

function Avatar() {
  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-semibold text-primary-foreground">
      MR
    </div>
  );
}

export function TopBar({ onBack }: { onBack?: () => void }) {
  return (
    <header className="flex h-[62px] shrink-0 items-center justify-between gap-3 rounded-[22px] bg-card px-3 shadow-card sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={onBack}
          aria-label="Back"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
        </button>
        <div className="hidden items-center gap-1.5 text-[14px] text-muted-foreground md:flex">
          <Clipboard className="h-4 w-4" />
          <span>Exams</span>
        </div>
        <div className="md:hidden">
          <MobileTopBrand />
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <button
          aria-label="Help"
          className="hidden h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-ink sm:grid"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
        </button>
        <button
          aria-label="Notifications"
          className="relative grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-ink"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-1.5 top-1.5 h-[6px] w-[6px] rounded-full bg-brand" />
        </button>
        <button
          aria-label="AI"
          className="hidden h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-ink sm:grid"
        >
          <Sparkles className="h-[18px] w-[18px]" />
        </button>
        <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-secondary sm:pr-2">
          <Avatar />
          <span className="hidden text-[14px] font-medium text-ink lg:block">Madhur Rastogi</span>
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground lg:block" />
        </button>
        <button
          aria-label="Menu"
          className="grid h-8 w-8 place-items-center rounded-lg text-ink hover:bg-secondary md:hidden"
        >
          <Menu className="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>
  );
}
