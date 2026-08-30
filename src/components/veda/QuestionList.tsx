import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { scoreStyles, type Question } from "@/lib/veda-data";
import { cn } from "@/lib/utils";

export function QuestionList({
  questions,
  activeId,
  onSelect,
  expanded,
  toggleExpand,
  expandAll,
  allExpanded,
}: {
  questions: Question[];
  activeId: string | null;
  onSelect: (id: string) => void;
  expanded: string[];
  toggleExpand: (id: string) => void;
  expandAll: () => void;
  allExpanded: boolean;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px] bg-card shadow-card">
      <div className="flex h-[48px] shrink-0 items-center justify-between gap-3 px-3 sm:px-4">
        <h2 className="truncate text-[12.5px] font-bold text-ink">
          Extracted Questions{" "}
          <span className="font-medium text-muted-foreground">(from question paper)</span>
        </h2>
        {questions.length > 0 && (
          <button
            onClick={expandAll}
            className="h-[30px] shrink-0 rounded-full border border-[oklch(0.9_0.003_264)] px-3 text-[11.5px] font-medium text-ink transition-colors hover:bg-secondary"
          >
            {allExpanded ? "Collapse All" : "Expand All"}
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-auto bg-[oklch(0.955_0.002_264)] p-2.5 sm:p-3">
        {questions.length === 0 ? (
          <div className="grid h-full place-items-center rounded-[12px] border border-dashed border-[oklch(0.9_0.003_264)] bg-card px-4 text-center text-[12px] text-muted-foreground">
            Upload a question paper to extract the live questions.
          </div>
        ) : (
          questions.map((q) => {
            const isActive = q.id === activeId;
            const isOpen = expanded.includes(q.id);
            return (
              <div
                key={q.id}
                onClick={() => onSelect(q.id)}
                className={cn(
                  "cursor-pointer rounded-[12px] bg-card px-2.5 py-2.5 transition-all",
                  isActive
                    ? "ring-[1.5px] ring-brand shadow-card"
                    : "ring-1 ring-[oklch(0.93_0.003_264)] hover:ring-muted-foreground/30",
                )}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-[1px] grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[10.5px] font-bold",
                      isActive
                        ? "bg-brand text-primary-foreground"
                        : "bg-[oklch(0.22_0.01_264)] text-primary-foreground",
                    )}
                  >
                    {q.number}
                  </span>
                  <p className="min-w-0 flex-1 pt-[2px] text-[11.5px] font-medium leading-[1.5] text-ink">
                    {q.text}
                  </p>
                  <span
                    className={cn(
                      "mt-[1px] shrink-0 rounded-full px-2 py-[3px] text-[10.5px] font-bold",
                      scoreStyles[q.state],
                    )}
                  >
                    {q.state === "unanswered"
                      ? "Unanswered"
                      : q.state === "answered"
                        ? "Answered"
                        : `${q.earned}/${q.total}`}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(q.id);
                    }}
                    aria-label="Toggle feedback"
                    className="mt-[3px] grid h-4 w-4 shrink-0 place-items-center text-muted-foreground"
                  >
                    <ChevronDown
                      className={cn(
                        "h-[15px] w-[15px] transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 rounded-[10px] bg-[oklch(0.965_0.002_264)] px-3 py-2.5">
                        <p className="text-[11.5px] font-bold text-ink">AI Feedback</p>
                        <p className="mt-1 text-[11px] leading-[1.5] text-muted-foreground">
                          {q.feedback}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
