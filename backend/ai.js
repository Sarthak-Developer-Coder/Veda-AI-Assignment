const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
  const candidate = fenced || text.match(/\{[\s\S]*\}/)?.[0];
  if (!candidate) throw new Error("AI returned no JSON object.");
  return JSON.parse(candidate);
}

async function askGemini(prompt, schema) {
  if (!process.env.GEMINI_API_KEY) return null;

  const response = await fetch(
    `${GEMINI_URL}?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
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

  if (!response.ok) {
    throw new Error(`Gemini request failed with HTTP ${response.status}.`);
  }

  const payload = await response.json();
  const text =
    payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  return extractJson(text);
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
