import { ArrowRight, Upload, X } from "lucide-react";
import { motion } from "motion/react";
import { useRef } from "react";
import teacher from "@/assets/teacher.png";
import { cn } from "@/lib/utils";

export type UploadFile = { name: string; size: string; pages: string; file?: File };

function DropZone({
  title,
  file,
  onPick,
  onClear,
}: {
  title: string;
  file: UploadFile | null;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <div className="grid min-h-[118px] place-items-center rounded-[16px] border border-dashed border-[oklch(0.87_0_0)] bg-card p-4 sm:min-h-[160px]">
      {file ? (
        <div className="relative flex w-full max-w-[248px] items-center gap-2.5 rounded-[12px] bg-[oklch(0.965_0.002_264)] px-3 py-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[7px] bg-[oklch(0.95_0.05_25)] text-[8px] font-bold text-danger">
            PDF
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-bold text-ink">{file.name}</p>
            <p className="mt-0.5 text-[10.5px] text-muted-foreground">
              {file.size} • {file.pages}
            </p>
          </div>
          <button
            onClick={onClear}
            aria-label={`Remove ${title}`}
            className="absolute -right-2.5 -top-2.5 grid h-6 w-6 place-items-center rounded-full bg-[oklch(0.35_0.01_264)] text-primary-foreground shadow-pop transition-transform hover:scale-105"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button onClick={onPick} className="flex flex-col items-center">
          <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-[oklch(0.955_0.002_264)] text-ink">
            <Upload className="h-[17px] w-[17px]" strokeWidth={2} />
          </span>
          <span className="mt-3 text-[14.5px] font-bold text-ink">
            Upload <span className="text-brand">{title}</span>
          </span>
          <span className="mt-1 text-[11px] text-muted-foreground">Max 10MB</span>
        </button>
      )}
    </div>
  );
}


export function UploadScreen({
  question,
  answer,
  setQuestion,
  setAnswer,
  onStart,
}: {
  question: UploadFile | null;
  answer: UploadFile | null;
  setQuestion: (f: UploadFile | null) => void;
  setAnswer: (f: UploadFile | null) => void;
  onStart: () => void;
}) {
  const ready = Boolean(question && answer);
  const questionInputRef = useRef<HTMLInputElement>(null);
  const answerInputRef = useRef<HTMLInputElement>(null);

  const formatFile = (file: File): UploadFile => ({
    name: file.name,
    size: `${(file.size / (1024 * 1024)).toFixed(1)}MB`,
    pages: file.type.includes("image") ? "1 Page" : "2 Pages",
    file,
  });

  const onFileSelected = (target: HTMLInputElement | null, setter: (f: UploadFile | null) => void) => {
    const file = target?.files?.[0];
    if (!file) return;
    setter(formatFile(file));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-1 flex-col items-center justify-center px-5 py-8 sm:px-6"
    >
      <h1 className="max-w-[300px] text-center text-[22px] font-extrabold leading-[1.28] tracking-[-0.01em] text-ink sm:max-w-[760px] sm:text-[33px] sm:leading-[1.15]">
        Upload{" "}
        <span className="text-ink sm:ml-1 sm:inline-block sm:rounded-[12px] sm:bg-[oklch(0.94_0.045_40)] sm:px-2.5 sm:py-1 sm:text-brand sm:underline sm:decoration-brand/70 sm:decoration-[2px] sm:underline-offset-[7px]">
          Question Paper &amp; Answer Sheets
        </span>
      </h1>
      <p className="mt-2.5 text-center text-[13.5px] text-muted-foreground sm:mt-3 sm:text-[15px]">
        Upload both files to get started
      </p>

      <div className="relative mt-5 grid h-[112px] w-[112px] place-items-center rounded-full bg-[oklch(0.94_0.045_40)] sm:mt-6 sm:h-[120px] sm:w-[120px]">
        <div className="grid h-[86px] w-[86px] place-items-center overflow-hidden rounded-full bg-[oklch(0.9_0.07_38)] sm:h-[92px] sm:w-[92px]">
          <img src={teacher} alt="Teacher illustration" width={512} height={512} className="h-[82px] w-[82px] object-contain sm:h-[88px] sm:w-[88px]" />
        </div>
        {[0, 90, 180, 270].map((deg) => (
          <span
            key={deg}
            className="absolute h-2 w-2 rounded-full bg-brand"
            style={{
              transform: `rotate(${deg + 45}deg) translate(56px) rotate(-${deg + 45}deg)`,
            }}
          />
        ))}
      </div>

      <input
        ref={questionInputRef}
        type="file"
        accept=".pdf,image/*"
        className="hidden"
        onChange={(e) => onFileSelected(e.target, setQuestion)}
      />
      <input
        ref={answerInputRef}
        type="file"
        accept=".pdf,image/*"
        className="hidden"
        onChange={(e) => onFileSelected(e.target, setAnswer)}
      />

      <div className="mt-6 w-full max-w-[340px] rounded-[20px] bg-[oklch(0.945_0.002_264)] p-2.5 sm:mt-7 sm:max-w-[672px] sm:rounded-[22px] sm:p-3">
        <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
          <DropZone
            title="Question Paper"
            file={question}
            onPick={() => questionInputRef.current?.click()}
            onClear={() => setQuestion(null)}
          />
          <DropZone
            title="Answer Sheet"
            file={answer}
            onPick={() => answerInputRef.current?.click()}
            onClear={() => setAnswer(null)}
          />
        </div>
      </div>

      <button
        disabled={!ready}
        onClick={onStart}
        className={cn(
          "mt-6 inline-flex h-11 items-center gap-2 rounded-full px-6 text-[13.5px] font-semibold transition-all sm:mt-7 sm:text-[14px]",
          ready
            ? "bg-[oklch(0.22_0.01_264)] text-primary-foreground shadow-pop hover:scale-[1.03]"
            : "cursor-not-allowed bg-[oklch(0.9_0.003_264)] text-muted-foreground",
        )}
      >
        Start Mapping <ArrowRight className="h-4 w-4" />
      </button>
      <p className="mt-4 max-w-[300px] text-center text-[11.5px] leading-[1.5] text-muted-foreground sm:max-w-none sm:text-[12px]">
        Once both files are uploaded, you&apos;ll able to map answers with questions
      </p>

    </motion.div>
  );
}
