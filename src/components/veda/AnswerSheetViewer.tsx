import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Minus, Plus } from "lucide-react";
import type { HandBlock, Question } from "@/lib/veda-data";
import { cn } from "@/lib/utils";

export function AnswerSheetViewer({
  questions,
  handBlocks,
  pageCount,
  activeId,
  zoom,
  setZoom,
  page,
  setPage,
  showUnmapped,
  setShowUnmapped,
  sourceUrl,
  sourceType,
}: {
  questions: Question[];
  handBlocks?: HandBlock[];
  pageCount?: number;
  activeId: string | null;
  zoom: number;
  setZoom: (z: number) => void;
  page: number;
  setPage: (p: number) => void;
  showUnmapped: boolean;
  setShowUnmapped: (v: boolean) => void;
  sourceUrl?: string;
  sourceType?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const active = questions.find((q) => q.id === activeId) ?? null;
  const hasRegions = (active?.regions.length ?? 0) > 0;
  const totalPages = Math.max(1, pageCount ?? 1);
  const blocks = [
    ...(handBlocks ?? []),
    ...questions.flatMap((question) =>
      question.regions.map((region, index) => ({
        id: question.id,
        page: region.page,
        top: region.top,
        left: region.left,
        width: region.width,
        height: region.height,
        label: question.number,
        lines: [],
        key: `${question.id}-${index}`,
      })),
    ),
  ];

  useEffect(() => {
    if (!activeId) return;
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-region="${activeId}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeId]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages, setPage]);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px] bg-[oklch(0.26_0.005_264)] shadow-card">
      <div className="flex h-[46px] shrink-0 items-center justify-between gap-2 px-3 sm:px-4">
        <h2 className="hidden shrink-0 whitespace-nowrap text-[13px] font-semibold text-white sm:block">
          Answer Sheet
        </h2>
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
          <button
            onClick={() => setShowUnmapped(!showUnmapped)}
            title="Toggle unassigned answers"
            className={cn(
              "hidden h-[30px] items-center gap-1.5 rounded-full px-3 text-[11.5px] font-medium transition-colors xl:flex",
              showUnmapped
                ? "bg-brand/20 text-brand"
                : "bg-white/10 text-white/60 hover:bg-white/15",
            )}
          >
            {showUnmapped ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            Unassigned
          </button>
          <div className="flex h-[30px] items-center gap-2.5 rounded-full bg-white/10 px-3 text-[12px] font-medium text-white">
            <button onClick={() => setZoom(Math.max(50, zoom - 10))} aria-label="Zoom out">
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="tabular-nums">{zoom}%</span>
            <button onClick={() => setZoom(Math.min(200, zoom + 10))} aria-label="Zoom in">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex h-[30px] items-center gap-2.5 rounded-full bg-white/10 px-3 text-[12px] font-medium text-white">
            <button onClick={() => setPage(Math.max(1, page - 1))} aria-label="Previous page">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="whitespace-nowrap">
              Page {page} of {totalPages}
            </span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} aria-label="Next page">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {active && !hasRegions && (
        <div className="mx-3 mb-2 rounded-[10px] bg-white/10 px-3 py-2 text-[11.5px] text-white/70 sm:mx-4">
          No answer found in answer sheet for Question {active.number}
          {active.sub ? ` (${active.sub})` : ""}.
        </div>
      )}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto bg-[oklch(0.26_0.005_264)] px-2 pb-2 sm:px-2.5 sm:pb-2.5"
      >
        <div
          className="mx-auto flex flex-col gap-2.5 origin-top transition-transform"
          style={{ width: `${zoom}%`, maxWidth: zoom <= 100 ? "100%" : "none" }}
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <div
              key={p}
              data-page={p}
              className="notebook-lines relative aspect-[1/1.3] w-full overflow-hidden rounded-[8px] bg-[oklch(0.985_0.006_95)]"
            >
              {sourceUrl && sourceType?.startsWith("image/") ? (
                <img
                  src={sourceUrl}
                  alt={`Answer sheet page ${p}`}
                  className="absolute inset-0 h-full w-full object-contain"
                />
              ) : sourceUrl && p === 1 ? (
                <iframe
                  src={`${sourceUrl}#page=${p}`}
                  title="Uploaded answer sheet"
                  className="absolute inset-0 h-full w-full border-0"
                />
              ) : (
                <span className="absolute inset-y-0 left-[8%] w-px bg-danger/45" />
              )}

              {blocks
                .filter((b) => b.page === p)
                .filter((b) => showUnmapped || !b.unmapped)
                .map((b, i) => {
                  const isActive = b.id === activeId;
                  return (
                    <div
                      key={`${b.id}-${i}`}
                      data-region={b.id}
                      className={cn(
                        "absolute rounded-md px-2 py-1 transition-all duration-300",
                        isActive
                          ? "bg-success/10 ring-2 ring-success"
                          : b.unmapped
                            ? "ring-1 ring-dashed ring-brand/60"
                            : "ring-0",
                      )}
                      style={{
                        top: `${b.top}%`,
                        left: `${b.left}%`,
                        width: `${b.width}%`,
                        minHeight: `${b.height}%`,
                      }}
                    >
                      {(isActive || b.unmapped) && (
                        <span
                          className={cn(
                            "absolute -top-3 left-0 rounded-md px-2 py-0.5 text-[10px] font-bold text-primary-foreground",
                            isActive ? "bg-success" : "bg-brand",
                          )}
                        >
                          {b.unmapped ? "Unassigned" : b.label.replace(".", "").replace(" ", "")}
                        </span>
                      )}
                      <div className="flex gap-2">
                        <span className="shrink-0 font-hand text-[15px] text-[oklch(0.35_0.12_265)]">
                          {b.label}
                        </span>
                        <div className="min-w-0 font-hand text-[15px] leading-[28px] text-[oklch(0.4_0.14_265)]">
                          {b.lines.map((l) => (
                            <p key={l} className="truncate">
                              {l}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
