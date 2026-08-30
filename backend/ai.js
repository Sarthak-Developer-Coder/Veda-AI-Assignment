const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
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
    `Map answer segments to questions. Use the detected question number as the strongest signal. Do not map by physical order. An answer may span multiple segments. Return one result for every answer segment and use an empty questionId for unmatched answers.\nQuestions:\n${JSON.stringify(questions)}\nAnswer segments:\n${JSON.stringify(answerSegments)}`,
    {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          answerId: { type: "STRING" },
          questionId: { type: "STRING" },
          confidence: { type: "NUMBER" },
          status: { type: "STRING", enum: ["answered", "unmatched", "uncertain"] },
        },
        required: ["answerId", "questionId", "confidence", "status"],
      },
    },
  );
}

export async function gradeAnswersWithAI(questions, answers) {
  return askGemini(
    `Evaluate every student's answer against its question. Award no more than the maximum marks. Do not infer content that is not in the answer. Return one result for every supplied question.\nQuestions: ${JSON.stringify(questions)}\nAnswers: ${JSON.stringify(answers)}`,
    {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          questionId: { type: "STRING" },
          marksAwarded: { type: "NUMBER" },
          maxMarks: { type: "NUMBER" },
          status: {
            type: "STRING",
            enum: ["correct", "partially_correct", "incorrect", "unanswered"],
          },
          feedback: { type: "STRING" },
        },
        required: ["questionId", "marksAwarded", "maxMarks", "status", "feedback"],
      },
    },
  );
}

export const hasAIProvider = () => Boolean(process.env.GEMINI_API_KEY);
