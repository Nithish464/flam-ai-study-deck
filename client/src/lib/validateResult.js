// validateResult.js
//
// Never trust the network. Even though the server already validates the
// model's output, this file re-checks the shape on the client before a
// single pixel of the parsed data reaches a component. If the server is
// swapped, buggy, or someone points this frontend at a different backend
// entirely, a malformed payload still can't reach the UI.
//
// Returns { valid: true, data } or { valid: false, reason }.

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

export function validateResult(payload) {
  if (!payload || typeof payload !== "object") {
    return { valid: false, reason: "Response was not an object." };
  }

  if (!Array.isArray(payload.cards)) {
    return { valid: false, reason: "Response had no 'cards' array." };
  }

  if (payload.cards.length === 0) {
    return { valid: false, reason: "Response had zero cards." };
  }

  const cards = [];
  for (const raw of payload.cards) {
    if (!isNonEmptyString(raw?.question)) {
      return { valid: false, reason: "A card was missing a question." };
    }
    if (!isNonEmptyString(raw?.answer)) {
      return { valid: false, reason: "A card was missing an answer." };
    }
    if (!Array.isArray(raw?.options) || raw.options.length !== 4) {
      return { valid: false, reason: "A card did not have exactly 4 options." };
    }
    if (!raw.options.every(isNonEmptyString)) {
      return { valid: false, reason: "A card had an empty option." };
    }
    if (!raw.options.includes(raw.answer)) {
      return { valid: false, reason: "A card's options did not include its answer." };
    }
    cards.push({
      id: isNonEmptyString(raw.id) ? raw.id : `card-${cards.length}-${Math.random().toString(36).slice(2, 8)}`,
      question: raw.question.trim(),
      answer: raw.answer.trim(),
      // Shuffle once here so option order is stable for the life of this
      // card (re-shuffling on every render would make quiz answers jump
      // around while the user is looking at them).
      options: shuffle(raw.options.map((o) => o.trim())),
    });
  }

  return {
    valid: true,
    data: {
      topic: isNonEmptyString(payload.topic) ? payload.topic.trim() : "Study set",
      cards,
    },
  };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
