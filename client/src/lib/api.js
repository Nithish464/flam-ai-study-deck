// api.js
//
// The only place the frontend talks to the network. It never calls an LLM
// provider directly and never sees an API key — it always hits our own
// backend proxy at /api/generate (forwarded to the Express server by Vite's
// dev proxy, see vite.config.js).

const REQUEST_TIMEOUT_MS = 35_000;

// A small typed error so callers (App.jsx) can show a specific message
// instead of a generic "something went wrong".
export class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ApiError";
    this.code = code; // 'TIMEOUT' | 'NETWORK' | 'BAD_INPUT' | 'SERVER' | 'BAD_SHAPE' | 'UNKNOWN'
  }
}

export async function generateStudySet(topic, { signal } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // If the caller passed its own abort signal (e.g. a stale-request guard
  // that wants to cancel this fetch outright), forward the abort to ours.
  const externalAbort = () => controller.abort();
  signal?.addEventListener("abort", externalAbort);

  let response;
  try {
    response = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ topic }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new ApiError("TIMEOUT", "The request took too long. Please try again.");
    }
    throw new ApiError("NETWORK", "Couldn't reach the server. Check your connection.");
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", externalAbort);
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new ApiError("BAD_SHAPE", "The server sent a response we couldn't read.");
  }

  if (!response.ok) {
    const code = body?.error?.code || "SERVER";
    const message =
      body?.error?.message ||
      "The server had a problem generating your study set. Please try again.";
    throw new ApiError(code, message);
  }

  return body;
}
