import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import Tesseract from "tesseract.js";
import { gradeAnswersWithAI, hasAIProvider, mapAnswersWithAI } from "./ai.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|bmp|gif)$/i;

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "../node_modules/pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

app.use(cors());
app.use(express.json({ limit: "20mb" }));
const clientDir = path.join(__dirname, "../dist/client");
app.use(express.static(clientDir));

const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname.replace(/\s+/g, "_")}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.pdf$/i.test(file.originalname) || IMAGE_EXTENSIONS.test(file.originalname)) {
      cb(null, true);
      return;
    }
    cb(new Error("Unsupported file type. Upload a PDF or PNG, JPEG, WebP, BMP, or GIF image."));
  },
});

const normalizeText = (value) => value.replace(/\s+/g, " ").trim();
const normalizeOCR = (value) =>
  normalizeText(value)
    .replace(/\b([A-Za-z]{2,})\s+fi\s+ne\b/gi, "$1fine")
    .replace(/\barti\s+fi\s+cial\b/gi, "artificial")
    .replace(/^\s*[.:-]\s*/, "")
    .trim();

function makeRegion(x, y, width, height, pageWidth, pageHeight) {
  return {
    left: Math.max(0, (x / pageWidth) * 100),
    top: Math.max(0, ((pageHeight - y - height) / pageHeight) * 100),
    width: Math.min(100, (width / pageWidth) * 100),
    height: Math.min(100, (height / pageHeight) * 100),
  };
}

async function extractPdfDocument(filePath) {
  const fileData = fs.readFileSync(filePath);
  const pdfData = Uint8Array.from(fileData);
  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
  const pages = [];
  const segments = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const pageItems = textContent.items
      .filter((item) => typeof item !== "string" && item.str)
      .map((item) => ({
        text: item.str.trim(),
        y: item.transform?.[5] ?? 0,
        x: item.transform?.[4] ?? 0,
        width: item.width || 0,
        height: item.height || Math.abs(item.transform?.[3] ?? 0),
      }))
      .filter((item) => item.text);
    const lines = [];

    for (const item of pageItems) {
      const previousLine = lines[lines.length - 1];
      if (!previousLine || Math.abs(previousLine.y - item.y) > 3) {
        lines.push({ ...item });
      } else {
        previousLine.text += ` ${item.text}`;
        previousLine.x = Math.min(previousLine.x, item.x);
        previousLine.width = Math.max(previousLine.width, item.x + item.width - previousLine.x);
        previousLine.height = Math.max(previousLine.height, item.height);
      }
    }

    const pageText = lines
      .map((line) => line.text)
      .join("\n")
      .replace(/[ \t]+/g, " ")
      .trim();
    pages.push(pageText);
    for (const line of lines) {
      segments.push({
        text: line.text,
        page: pageNum,
        confidence: 1,
        region: makeRegion(
          line.x,
          line.y,
          line.width,
          line.height,
          viewport.width,
          viewport.height,
        ),
      });
    }
  }

  return {
    text: pages.filter(Boolean).join("\n\n"),
    segments,
    pageCount: pdf.numPages,
  };
}

async function extractImageDocument(filePath) {
  const result = await Tesseract.recognize(filePath, "eng", {
    logger: () => undefined,
  });
  const text = String(result.data.text || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const width = result.data.width || 1;
  const height = result.data.height || 1;
  const segments = (result.data.lines || []).map((line, index) => ({
    id: `ocr_${index + 1}`,
    text: line.text.trim(),
    page: 1,
    confidence: Number(line.confidence || 0) / 100,
    region: makeRegion(
      line.bbox.x0,
      height - line.bbox.y1,
      line.bbox.x1 - line.bbox.x0,
      line.bbox.y1 - line.bbox.y0,
      width,
      height,
    ),
  }));
  return { text, segments, pageCount: 1 };
}

async function extractDocument(filePath, originalName) {
  if (/\.pdf$/i.test(originalName)) {
    return extractPdfDocument(filePath);
  }

  if (IMAGE_EXTENSIONS.test(originalName)) {
    return extractImageDocument(filePath);
  }

  return { text: fs.readFileSync(filePath, "utf8"), segments: [], pageCount: 1 };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseQuestionCandidates(rawText) {
  const normalized = String(rawText || "")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\n\s*\n+/g, "\n\n");

  const lines = normalized
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const questions = [];
  let current = null;

  const flushCurrent = () => {
    if (!current) return;

    const textLines = current.lines.filter(Boolean).map((line) => line.replace(/\s+/g, " ").trim());
    const text = textLines.join(" ").trim();
    if (!text) return;

    const normalizedText = text
      .replace(new RegExp(`^${escapeRegExp(current.number)}`, "i"), "")
      .trim();
    const questionText = normalizeOCR(
      normalizedText
        .replace(
          new RegExp(
            `^\\s*(?:\\(\\s*${escapeRegExp(current.sub || "")}\\s*\\)|${escapeRegExp(current.sub || "")})?\\s*[:\\-]\\s*`,
            "i",
          ),
          "",
        )
        .trim(),
    );

    if (
      /^(answer all|write the question|for questions|end of question|section\b|page\s+\d+)\b/i.test(
        questionText,
      )
    ) {
      current = null;
      return;
    }

    questions.push({
      id: current.sub ? `${current.number}${current.sub}` : String(current.number),
      number: current.sub ? `${current.number}(${current.sub})` : String(current.number),
      text: questionText || text,
      sub: current.sub || undefined,
    });

    current = null;
  };

  const questionPrefixPattern =
    /^\s*(?:Q(?:uestion)?\s*)?(\d{1,3})\s*(?:[\.)]|[\:])?\s*(?:\(\s*([a-z])\s*\))?\s*(?:\s*[:\-])?\s*(.*)$/i;

  for (const rawLine of lines) {
    const match = rawLine.match(questionPrefixPattern);

    if (match) {
      const number = match[1];
      const sub = (match[2] || "").toLowerCase();
      const remainder = (match[3] || "").trim();

      flushCurrent();
      current = {
        number,
        sub: sub || undefined,
        lines: remainder ? [remainder] : [],
      };
      continue;
    }

    if (current) {
      current.lines.push(rawLine);
    }
  }

  flushCurrent();

  const uniqueQuestions = [];
  const seen = new Set();

  for (const item of questions) {
    const key = `${item.number}|${item.text.slice(0, 80)}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueQuestions.push(item);
    }
  }

  return uniqueQuestions;
}

function scoreQuestionState(earned, total) {
  if (earned <= 0) return "unanswered";
  if (earned < total) return "partial";
  return "good";
}

function buildAnswerSegments(document) {
  const segments = [];
  let current = null;
  const heading =
    /^\s*(?:q(?:uestion)?\s*)?(\d{1,3})\s*(?:[.)]|:)?\s*(?:\(\s*([a-z])\s*\))?\s*[:\-]?\s*(.*)$/i;

  const finish = () => {
    if (!current || !current.text.trim()) return;
    const regionsByPage = new Map();
    for (const line of current.lines) {
      if (!line.region) continue;
      const pageRegions = regionsByPage.get(line.page) || [];
      pageRegions.push(line.region);
      regionsByPage.set(line.page, pageRegions);
    }
    const regions = [...regionsByPage.entries()].map(([page, pageRegions]) => {
      const left = Math.min(...pageRegions.map((region) => region.left));
      const top = Math.min(...pageRegions.map((region) => region.top));
      const right = Math.max(...pageRegions.map((region) => region.left + region.width));
      const bottom = Math.max(...pageRegions.map((region) => region.top + region.height));
      return { page, top, left, width: right - left, height: bottom - top };
    });
    segments.push({
      answerId: `answer_${String(segments.length + 1).padStart(3, "0")}`,
      questionId: current.sub ? `${current.number}${current.sub}` : current.number,
      text: normalizeOCR(current.text),
      page: current.lines[0]?.page || 1,
      regions,
    });
    current = null;
  };

  for (const line of document.segments) {
    const match = line.text.match(heading);
    if (match) {
      finish();
      current = {
        number: match[1],
        sub: (match[2] || "").toLowerCase(),
        text: match[3] || "",
        lines: [line],
      };
    } else if (current) {
      current.text += ` ${line.text}`;
      current.lines.push(line);
    }
  }
  finish();
  return segments;
}

async function alignQuestionsWithAnswerData(questionList, answerDocument) {
  const answerSegments = buildAnswerSegments(answerDocument);
  let aiMappings = null;
  if (hasAIProvider()) {
    try {
      aiMappings = await mapAnswersWithAI(questionList, answerSegments);
    } catch (error) {
      console.error("AI answer mapping unavailable:", error);
    }
  }

  let aiGrades = null;
  const matchedAnswers = questionList
    .map((question) => {
      const answer = answerSegments.find((item) => item.questionId === question.id);
      return answer ? { question, answer } : null;
    })
    .filter(Boolean);
  if (hasAIProvider() && matchedAnswers.length) {
    try {
      aiGrades = await gradeAnswersWithAI(
        matchedAnswers.map(({ question }) => question),
        matchedAnswers.map(({ answer }) => answer),
      );
    } catch (error) {
      console.error("AI batch grading unavailable:", error);
    }
  }

  return questionList.map((question) => {
    const mapping =
      aiMappings?.find((item) => item.questionId === question.id) ||
      (answerSegments.some((item) => item.questionId === question.id)
        ? { questionId: question.id, confidence: 1, status: "answered" }
        : null);
    const answer = answerSegments.find((item) => item.questionId === question.id);
    const answerDetected = Boolean(mapping && mapping.confidence >= 0.65 && answer);
    const grade = aiGrades?.find((item) => item.questionId === question.id);

    const earned = grade
      ? Math.min(question.total, Math.max(0, Number(grade.marksAwarded) || 0))
      : 0;
    const state =
      grade?.status === "correct"
        ? "good"
        : grade?.status === "partially_correct"
          ? "partial"
          : grade?.status === "incorrect"
            ? "bad"
            : answerDetected
              ? "answered"
              : "unanswered";

    return {
      ...question,
      earned,
      state,
      feedback:
        grade?.feedback ||
        (answerDetected
          ? "Answer detected, but AI grading is unavailable. Check the Gemini key and Render deployment logs."
          : "No answer was detected for this question."),
      answerIds: answerDetected ? [answer.answerId] : [],
      regions: answer?.regions || [],
    };
  });
}

async function buildAssessmentFromDocument(filePath, originalName, documentType = "question") {
  const document = await extractDocument(filePath, originalName);
  const rawText = document.text;
  const pageCount = document.pageCount;
  const parsedQuestions = parseQuestionCandidates(rawText);

  if (process.env.NODE_ENV !== "production") {
    console.log("[DEV] raw extraction text:", rawText.slice(0, 4000));
    console.log("[DEV] parsed question candidates:", JSON.stringify(parsedQuestions, null, 2));
  }

  if (documentType === "question" && parsedQuestions.length === 0) {
    throw new Error(
      "Question extraction failed: no numbered questions were detected in the uploaded question paper.",
    );
  }

  if (documentType === "answer" && !rawText.trim()) {
    throw new Error(
      "Answer extraction failed: no readable text was detected in the uploaded answer sheet.",
    );
  }

  if (documentType === "question" && parsedQuestions.length < 3) {
    throw new Error(
      `Question extraction produced too few questions (${parsedQuestions.length}). This usually means the uploaded document could not be parsed correctly.`,
    );
  }

  const fallbackText = normalizeText(rawText || "");
  const questions = parsedQuestions.length
    ? parsedQuestions.map((item, index) => ({
        id: item.id,
        number: item.number,
        ...(item.sub ? { sub: item.sub } : {}),
        text: item.text,
        earned: 0,
        total: 1,
        state: "unanswered",
        feedback: "No answer was detected for this question.",
        regions: [],
      }))
    : [
        {
          id: "q1",
          number: "1",
          text:
            fallbackText.slice(0, 260) || "No readable question text was detected in this file.",
          earned: 0,
          total: 1,
          state: "unanswered",
          feedback: "The document could not be parsed into numbered questions automatically.",
          regions: [],
        },
      ];

  return {
    questions,
    summary: {
      totalQuestions: questions.length,
      answered: questions.filter((q) => q.state !== "unanswered").length,
      unanswered: questions.filter((q) => q.state === "unanswered").length,
      averageScore: questions.length
        ? Math.round(
            (questions.reduce((sum, q) => sum + q.earned, 0) /
              questions.reduce((sum, q) => sum + q.total, 0)) *
              100,
          )
        : 0,
    },
    rawText,
    pageCount,
    segments: document.segments,
  };
}

app.post(
  "/api/process",
  upload.fields([
    { name: "questionPaper", maxCount: 1 },
    { name: "answerSheet", maxCount: 1 },
  ]),
  async (req, res) => {
    const files = req.files || {};
    const questionPaper = files.questionPaper?.[0];
    const answerSheet = files.answerSheet?.[0];

    if (!questionPaper || !answerSheet) {
      return res.status(400).json({ error: "Both files are required." });
    }

    try {
      const questionAssessment = await buildAssessmentFromDocument(
        questionPaper.path,
        questionPaper.originalname,
        "question",
      );
      const answerAssessment = await buildAssessmentFromDocument(
        answerSheet.path,
        answerSheet.originalname,
        "answer",
      );
      const answerSegments = buildAnswerSegments(answerAssessment);
      const mappedQuestions = await alignQuestionsWithAnswerData(
        questionAssessment.questions,
        answerAssessment,
      );
      const questionIds = new Set(questionAssessment.questions.map((question) => question.id));
      const unmatchedAnswers = answerSegments.filter(
        (answer) => !questionIds.has(answer.questionId),
      );
      const maximumMarks = mappedQuestions.reduce((sum, question) => sum + question.total, 0);
      const earnedMarks = mappedQuestions.reduce((sum, question) => sum + question.earned, 0);

      return res.json({
        ok: true,
        uploaded: {
          questionPaper: questionPaper.originalname,
          answerSheet: answerSheet.originalname,
        },
        assessment: {
          questions: mappedQuestions,
          summary: {
            totalQuestions: mappedQuestions.length,
            answered: mappedQuestions.filter((question) => question.state !== "unanswered").length,
            unanswered: mappedQuestions.filter((question) => question.state === "unanswered")
              .length,
            unmatched: unmatchedAnswers.length,
            totalMarks: earnedMarks,
            maximumMarks,
            percentage: maximumMarks ? Math.round((earnedMarks / maximumMarks) * 1000) / 10 : 0,
            aiEnabled: hasAIProvider(),
          },
          extractedText: {
            questionPaper: questionAssessment.rawText,
            answerSheet: answerAssessment.rawText,
          },
          pageCount: answerAssessment.pageCount,
          answers: answerSegments,
        },
      });
    } catch (error) {
      console.error("Document processing failed:", error);
      return res.status(500).json({
        error: "Unable to process the uploaded documents.",
        details: error instanceof Error ? error.message : "Unknown processing error",
      });
    }
  },
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, status: "healthy" });
});

app.get("/", (_req, res) => {
  const indexFile = path.join(clientDir, "index.html");
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
    return;
  }
  res.json({ ok: true, service: "VedaAI API", health: "/api/health" });
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    next();
    return;
  }
  const indexFile = path.join(clientDir, "index.html");
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
    return;
  }
  res.status(404).json({ error: "Route not found." });
});

app.listen(PORT, () => {
  console.log(`VedaAI backend listening on http://localhost:${PORT}`);
});
