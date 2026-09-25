const REQUEST_TIMEOUT_MS = 30000;

const PRIMARY_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.8-flash";

const FALLBACK_MODEL =
  process.env.GEMINI_FALLBACK_MODEL ||
  "gemini-3.5-flash-lite";

const BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

export class GenerationError extends Error {
  constructor(code, message, cause = null) {
    super(message);
    this.name = "GenerationError";
    this.code = code;
    this.cause = cause;
  }
}

const SYSTEM_PROMPT = `
You are an AI-powered interactive study assistant.

Return ONLY valid JSON.

Required structure:

{
  "topic": "string",
  "cards": [
    {
      "question": "string",
      "answer": "string",
      "options": [
        "string",
        "string",
        "string",
        "string"
      ]
    }
  ]
}

Rules:
- Generate exactly 8 cards.
- Every card must have exactly 4 options.
- The answer must exactly match one option.
- Questions must be educational and clear.
- Wrong options must be plausible but incorrect.
- Do not create trick questions.
- Do not return markdown.
- Do not return code fences.
- Do not return null values.
- Do not return empty strings.
- Return JSON only.
`;

function buildPrompt(userInput) {
  return `
Create an interactive study deck for the following topic:

${userInput}

Return only the required JSON.
`;
}

function validateStudySet(data) {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    throw new GenerationError(
      "PARSE",
      "The AI returned an invalid JSON object."
    );
  }

  if (
    typeof data.topic !== "string" ||
    !data.topic.trim()
  ) {
    throw new GenerationError(
      "PARSE",
      "The AI returned an invalid topic."
    );
  }

  if (
    !Array.isArray(data.cards) ||
    data.cards.length !== 8
  ) {
    throw new GenerationError(
      "PARSE",
      "The AI must return exactly 8 cards."
    );
  }

  for (let i = 0; i < data.cards.length; i++) {
    const card = data.cards[i];

    if (
      !card ||
      typeof card.question !== "string" ||
      !card.question.trim()
    ) {
      throw new GenerationError(
        "PARSE",
        `Card ${i + 1} has an invalid question.`
      );
    }

    if (
      typeof card.answer !== "string" ||
      !card.answer.trim()
    ) {
      throw new GenerationError(
        "PARSE",
        `Card ${i + 1} has an invalid answer.`
      );
    }

    if (
      !Array.isArray(card.options) ||
      card.options.length !== 4
    ) {
      throw new GenerationError(
        "PARSE",
        `Card ${i + 1} must contain exactly 4 options.`
      );
    }

    if (
      card.options.some(
        (option) =>
          typeof option !== "string" ||
          !option.trim()
      )
    ) {
      throw new GenerationError(
        "PARSE",
        `Card ${i + 1} contains an empty option.`
      );
    }

    if (!card.options.includes(card.answer)) {
      throw new GenerationError(
        "PARSE",
        `Card ${i + 1} answer does not match an option.`
      );
    }
  }

  return {
    topic: data.topic.trim(),

    cards: data.cards.map((card) => ({
      question: card.question.trim(),
      answer: card.answer.trim(),
      options: card.options.map(
        (option) => option.trim()
      )
    }))
  };
}

function parseModelResponse(payload) {
  const text =
    payload?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || "")
      .join("")
      .trim();

  if (!text) {
    throw new GenerationError(
      "EMPTY",
      "The AI returned an empty response."
    );
  }

  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GenerationError(
      "PARSE",
      "The AI returned malformed JSON."
    );
  }

  return validateStudySet(parsed);
}

function isRetryableStatus(status) {
  return (
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

async function requestModel(
  model,
  userInput,
  attempt = 0
) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new GenerationError(
      "CONFIG",
      "GEMINI_API_KEY is missing from server/.env."
    );
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const url =
      `${BASE_URL}/${model}:generateContent` +
      `?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      signal: controller.signal,

      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: SYSTEM_PROMPT
            }
          ]
        },

        contents: [
          {
            role: "user",
            parts: [
              {
                text: buildPrompt(userInput)
              }
            ]
          }
        ],

        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    const bodyText = await response.text();

    let payload = null;

    try {
      payload = bodyText
        ? JSON.parse(bodyText)
        : null;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const providerMessage =
        payload?.error?.message ||
        `Gemini returned HTTP ${response.status}.`;

      console.error(
        `[Gemini] ${model} -> ${response.status}: ${providerMessage}`
      );

      if (
        isRetryableStatus(response.status) &&
        attempt < 2
      ) {
        const delay =
          1000 * Math.pow(2, attempt);

        console.log(
          `[Gemini] Retrying ${model} in ${delay}ms...`
        );

        await new Promise((resolve) =>
          setTimeout(resolve, delay)
        );

        return requestModel(
          model,
          userInput,
          attempt + 1
        );
      }

      throw new GenerationError(
        "UPSTREAM",
        `Gemini API error: ${providerMessage}`,
        payload
      );
    }

    return parseModelResponse(payload);
  } catch (error) {
    if (error instanceof GenerationError) {
      throw error;
    }

    if (error.name === "AbortError") {
      throw new GenerationError(
        "TIMEOUT",
        `Gemini ${model} request timed out.`
      );
    }

    throw new GenerationError(
      "UPSTREAM",
      `Could not connect to Gemini ${model}.`,
      error
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateStudySet(userInput) {
  if (
    typeof userInput !== "string" ||
    !userInput.trim()
  ) {
    throw new GenerationError(
      "BAD_INPUT",
      "Please enter a study topic."
    );
  }

  console.log(
    `[Gemini] Trying primary model: ${PRIMARY_MODEL}`
  );

  try {
    return await requestModel(
      PRIMARY_MODEL,
      userInput
    );
  } catch (primaryError) {
    console.error(
      `[Gemini] Primary model failed: ${primaryError.message}`
    );

    if (PRIMARY_MODEL === FALLBACK_MODEL) {
      throw primaryError;
    }

    console.log(
      `[Gemini] Trying fallback model: ${FALLBACK_MODEL}`
    );

    try {
      return await requestModel(
        FALLBACK_MODEL,
        userInput
      );
    } catch (fallbackError) {
      console.error(
        `[Gemini] Fallback model failed: ${fallbackError.message}`
      );

      throw new GenerationError(
        "UPSTREAM",
        `Both Gemini models failed. Primary: ${primaryError.message} Fallback: ${fallbackError.message}`
      );
    }
  }
}