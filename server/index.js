import "dotenv/config";
import express from "express";
import cors from "cors";
import { generateStudySet, GenerationError } from "./generate.js";

const app = express();

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN =
  process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: CORS_ORIGIN
  })
);

app.use(
  express.json({
    limit: "100kb"
  })
);

const MIN_INPUT_LEN = 3;
const MAX_INPUT_LEN = 6000;

function isValidStudySet(data) {
  if (!data || typeof data !== "object") {
    return "Response was not an object.";
  }

  if (
    !Array.isArray(data.cards) ||
    data.cards.length === 0
  ) {
    return "Response had no cards array.";
  }

  for (const [i, card] of data.cards.entries()) {
    if (
      typeof card?.question !== "string" ||
      !card.question.trim()
    ) {
      return `Card ${i} is missing a question.`;
    }

    if (
      typeof card?.answer !== "string" ||
      !card.answer.trim()
    ) {
      return `Card ${i} is missing an answer.`;
    }

    if (
      !Array.isArray(card.options) ||
      card.options.length !== 4
    ) {
      return `Card ${i} does not have exactly 4 options.`;
    }

    if (!card.options.includes(card.answer)) {
      return `Card ${i}'s options do not include its answer.`;
    }
  }

  return null;
}

app.post("/api/generate", async (req, res) => {
  const topic =
    typeof req.body?.topic === "string"
      ? req.body.topic.trim()
      : "";

  if (topic.length < MIN_INPUT_LEN) {
    return res.status(400).json({
      error: {
        code: "BAD_INPUT",
        message: "Please enter a bit more text."
      }
    });
  }

  if (topic.length > MAX_INPUT_LEN) {
    return res.status(400).json({
      error: {
        code: "BAD_INPUT",
        message: `Please keep input under ${MAX_INPUT_LEN} characters.`
      }
    });
  }

  console.log(
    `\n[generate] Request received: "${topic.slice(0, 100)}"`
  );

  try {
    const data = await generateStudySet(topic);

    const shapeError = isValidStudySet(data);

    if (shapeError) {
      console.error(
        "[generate] Invalid study-set shape:",
        shapeError
      );

      return res.status(502).json({
        error: {
          code: "BAD_SHAPE",
          message: shapeError
        }
      });
    }

    const cards = data.cards.map((card, i) => ({
      id: `card-${i}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

      question: card.question,

      answer: card.answer,

      options: card.options
    }));

    console.log(
      `[generate] Success: ${cards.length} cards generated`
    );

    return res.json({
      topic: data.topic || topic,
      cards
    });
  } catch (err) {
    console.error("\n========== GENERATION ERROR ==========");
    console.error("Error name:", err?.name);
    console.error("Error code:", err?.code);
    console.error("Error message:", err?.message);

    if (err?.cause) {
      console.error("Cause:", err.cause);
    }

    console.error("======================================\n");

    if (err instanceof GenerationError) {
      const statusByCode = {
        CONFIG: 500,
        UPSTREAM: 502,
        TIMEOUT: 504,
        PARSE: 502,
        EMPTY: 502
      };

      return res.status(
        statusByCode[err.code] || 500
      ).json({
        error: {
          code: err.code,
          message: err.message
        }
      });
    }

    return res.status(500).json({
      error: {
        code: "UNKNOWN",
        message: "Something went wrong on the server."
      }
    });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true
  });
});

app.listen(PORT, () => {
  console.log(
    `Study Deck server listening on http://localhost:${PORT}`
  );
});