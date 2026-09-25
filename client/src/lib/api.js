// api.js
//
// Frontend API client.
// In development, requests use Vite's /api proxy.
// In production, requests use the deployed Render backend.

const REQUEST_TIMEOUT_MS = 35_000;

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "";

export class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

export async function generateStudySet(topic, { signal } = {}) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  const externalAbort = () => {
    controller.abort();
  };

  signal?.addEventListener("abort", externalAbort);

  let response;

  try {
    response = await fetch(
      `${API_BASE_URL}/api/generate`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          topic
        }),

        signal: controller.signal
      }
    );
  } catch (error) {
    if (error.name === "AbortError") {
      throw new ApiError(
        "TIMEOUT",
        "The request took too long. Please try again."
      );
    }

    throw new ApiError(
      "NETWORK",
      "Couldn't reach the server. Check your connection."
    );
  } finally {
    clearTimeout(timeout);

    signal?.removeEventListener(
      "abort",
      externalAbort
    );
  }

  let body;

  try {
    body = await response.json();
  } catch {
    throw new ApiError(
      "BAD_SHAPE",
      "The server sent a response we couldn't read."
    );
  }

  if (!response.ok) {
    const code =
      body?.error?.code || "SERVER";

    const message =
      body?.error?.message ||
      "The server had a problem generating your study set. Please try again.";

    throw new ApiError(code, message);
  }

  return body;
}