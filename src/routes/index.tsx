import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { VedaSidebar } from "@/components/veda/Sidebar";
import { TopBar } from "@/components/veda/TopBar";
import { UploadScreen, type UploadFile } from "@/components/veda/UploadScreen";
import { Extracting } from "@/components/veda/Extracting";
import { QuestionList } from "@/components/veda/QuestionList";
import { AnswerSheetViewer } from "@/components/veda/AnswerSheetViewer";
import type { Question } from "@/lib/veda-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VedaAI — AI Assessment Extraction & Answer Mapping" },
      {
        name: "description",
        content:
          "Upload a question paper and student answer sheets, extract questions with AI, and map every answer to its handwritten region.",
      },
      { property: "og:title", content: "VedaAI — AI Assessment Extraction & Answer Mapping" },
      {
        property: "og:description",
        content:
          "Extract exam questions, auto-grade answers and map them to handwritten answer sheet regions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Stage = "upload" | "extracting" | "results";

function Index() {
  const [collapsed, setCollapsed] = useState(false);
  const [stage, setStage] = useState<Stage>("upload");
  const [question, setQuestion] = useState<UploadFile | null>(null);
  const [answer, setAnswer] = useState<UploadFile | null>(null);
  const [activeId, setActiveId] = useState<string | null>("q2");
  const [expanded, setExpanded] = useState<string[]>(["q1"]);
  const [zoom, setZoom] = useState(100);
  const [page, setPage] = useState(1);
  const [showUnmapped, setShowUnmapped] = useState(true);
  const [mobileTab, setMobileTab] = useState<"questions" | "sheet">("questions");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [answerUrl, setAnswerUrl] = useState<string | undefined>();
  const [answerPageCount, setAnswerPageCount] = useState(1);

  useEffect(() => {
    if (!answer?.file) {
      setAnswerUrl(undefined);
      return;
    }
    const url = URL.createObjectURL(answer.file);
    setAnswerUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [answer?.file]);

  useEffect(() => {
    if (!questions.length) {
      setActiveId(null);
      setExpanded([]);
      return;
    }

    if (!activeId || !questions.some((q) => q.id === activeId)) {
      setActiveId(questions[0].id);
      setExpanded([questions[0].id]);
    }
  }, [questions, activeId]);

  const allExpanded = questions.length > 0 && expanded.length === questions.length;

  const handleStartMapping = async () => {
    if (!question?.file || !answer?.file) return;

    setStage("extracting");
    setProcessingError(null);

    try {
      const formData = new FormData();
      formData.append("questionPaper", question.file);
      formData.append("answerSheet", answer.file);

      const apiBase = import.meta.env.VITE_API_URL || "";
      const response = await fetch(`${apiBase}/api/process`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        throw new Error(failure.details || failure.error || "Upload processing failed");
      }

      const payload = await response.json();
      const extractedQuestions = Array.isArray(payload?.assessment?.questions)
        ? payload.assessment.questions
        : [];

      setQuestions(extractedQuestions);
      setAnswerPageCount(Number(payload?.assessment?.pageCount) || 1);
      if (extractedQuestions.length) {
        setActiveId(extractedQuestions[0].id);
        setExpanded([extractedQuestions[0].id]);
      }
      setStage("results");
    } catch (error) {
      console.error("Assessment processing failed", error);
      setProcessingError(
        error instanceof Error ? error.message : "Unable to process the uploaded documents.",
      );
      setQuestions([]);
      setActiveId(null);
      setExpanded([]);
      setStage("upload");
    }
  };

  return (
    <div className="flex h-screen gap-3 bg-background p-3">
      <VedaSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      <main className="flex min-w-0 flex-1 flex-col gap-3">
        <TopBar
          onBack={() => {
            setStage("upload");
            setQuestion(null);
            setAnswer(null);
          }}
        />

        {stage === "upload" && (
          <div className="flex min-h-0 flex-1 flex-col overflow-auto rounded-[22px] bg-card shadow-card">
            <UploadScreen
              question={question}
              answer={answer}
              setQuestion={setQuestion}
              setAnswer={setAnswer}
              onStart={handleStartMapping}
            />
          </div>
        )}

        {stage === "extracting" && <Extracting />}

        {processingError && (
          <p className="rounded-[12px] bg-danger/10 px-4 py-3 text-[12px] text-danger" role="alert">
            {processingError}
          </p>
        )}

        {stage === "results" && (
          <>
            <div className="flex shrink-0 gap-1 rounded-full bg-card p-1 shadow-card lg:hidden">
              {(["questions", "sheet"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setMobileTab(t)}
                  className={cn(
                    "h-9 flex-1 rounded-full text-[13px] font-semibold transition-colors",
                    mobileTab === t ? "bg-ink text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {t === "questions" ? "Questions" : "Answer Sheet"}
                </button>
              ))}
            </div>

            <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
              <div
                className={cn("min-h-0", mobileTab === "questions" ? "flex" : "hidden", "lg:flex")}
              >
                <QuestionList
                  questions={questions}
                  activeId={activeId}
                  onSelect={(id) => {
                    setActiveId(id);
                    const q = questions.find((x) => x.id === id);
                    if (q?.regions[0]) setPage(q.regions[0].page);
                    setMobileTab("sheet");
                  }}
                  expanded={expanded}
                  toggleExpand={(id) =>
                    setExpanded((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]))
                  }
                  expandAll={() => setExpanded(allExpanded ? [] : questions.map((q) => q.id))}
                  allExpanded={allExpanded}
                />
              </div>
              <div className={cn("min-h-0", mobileTab === "sheet" ? "flex" : "hidden", "lg:flex")}>
                <AnswerSheetViewer
                  questions={questions}
                  handBlocks={[]}
                  pageCount={answerPageCount}
                  sourceUrl={answerUrl}
                  sourceType={answer?.file?.type}
                  activeId={activeId}
                  zoom={zoom}
                  setZoom={setZoom}
                  page={page}
                  setPage={setPage}
                  showUnmapped={showUnmapped}
                  setShowUnmapped={setShowUnmapped}
                />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
