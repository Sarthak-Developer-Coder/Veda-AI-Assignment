const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GEMINI_FALLBACK_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let availableModelsPromise;

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
  const candidate = fenced || text.match(/\{[\s\S]*\}/)?.[0];
  if (!candidate) throw new Error("AI returned no JSON object.");
  return JSON.parse(candidate);
}

async function askGemini(prompt, schema) {
  if (!GEMINI_API_KEY) return null;

  const discoveredModels = await discoverGeminiModels();
  let models = [...new Set([GEMINI_MODEL, ...discoveredModels, ...GEMINI_FALLBACK_MODELS])];
  let lastResponse;

  for (const model of models) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        }),
        signal: AbortSignal.timeout(45_000),
      },
    );

    if (response.ok) {
      const payload = await response.json();
      const text =
        payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
      return extractJson(text);
    }

    lastResponse = response;
    if (response.status !== 404) {
      break;
    }
  }

  throw new Error(`Gemini request failed with HTTP ${lastResponse?.status || 500}.`);
}

async function discoverGeminiModels() {
  if (availableModelsPromise) return availableModelsPromise;

  availableModelsPromise = fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    { signal: AbortSignal.timeout(15_000) },
  )
    .then(async (response) => {
      if (!response.ok) {
        console.error(`Gemini model discovery failed with HTTP ${response.status}.`);
        return [];
      }
      const payload = await response.json();
      return (payload.models || [])
        .filter((model) => model.supportedGenerationMethods?.includes("generateContent"))
        .map((model) => String(model.name || "").replace(/^models\//, ""))
        .filter((model) => /flash/i.test(model));
    })
    .catch((error) => {
      console.error("Gemini model discovery failed:", error);
      return [];
    });

  return availableModelsPromise;
}

export async function mapAnswersWithAI(questions, answerSegments) {
  return askGemini(
    `Map answer segments to questions. Use the detected question number as the strongest signal. Do not map by physical order. An answer may span multiple segments. Return one result for every answer segment and use null for questionId when unmatched.\nQuestions:\n${JSON.stringify(questions)}\nAnswer segments:\n${JSON.stringify(answerSegments)}`,
    {
      type: "array",
      items: {
        type: "object",
        properties: {
          answerId: { type: "string", nullable: true },
          questionId: { type: "string", nullable: true },
          confidence: { type: "number" },
          status: { type: "string", enum: ["answered", "unmatched", "uncertain"] },
        },
        required: ["answerId", "questionId", "confidence", "status"],
      },
    },
  );
}

export async function gradeAnswersWithAI(question, answerText) {
  return askGemini(
    `Evaluate this student's answer against the question. Award no more than the maximum marks. Do not infer content that is not in the answer. Return only the requested JSON.\nQuestion: ${JSON.stringify(question)}\nStudent answer: ${JSON.stringify(answerText)}`,
    {
      type: "object",
      properties: {
        marksAwarded: { type: "number" },
        maxMarks: { type: "number" },
        status: {
          type: "string",
          enum: ["correct", "partially_correct", "incorrect", "unanswered"],
        },
        feedback: { type: "string" },
      },
      required: ["marksAwarded", "maxMarks", "status", "feedback"],
    },
  );
}

export const hasAIProvider = () => Boolean(process.env.GEMINI_API_KEY);
