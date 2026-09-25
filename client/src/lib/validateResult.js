// validateResult.js
//
// Never trust the network.
// Validate the complete response before it reaches the UI.

function isNonEmptyString(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(
      Math.random() * (i + 1)
    );

    [result[i], result[j]] = [
      result[j],
      result[i]
    ];
  }

  return result;
}

function getStudySet(payload) {
  // Normal backend response:
  // { topic, cards }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray(payload.cards)
  ) {
    return payload;
  }

  // Also support:
  // { data: { topic, cards } }

  if (
    payload?.data &&
    typeof payload.data === "object" &&
    Array.isArray(payload.data.cards)
  ) {
    return payload.data;
  }

  // Also support:
  // { result: { topic, cards } }

  if (
    payload?.result &&
    typeof payload.result === "object" &&
    Array.isArray(payload.result.cards)
  ) {
    return payload.result;
  }

  return null;
}

export function validateResult(payload) {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    return {
      valid: false,
      reason: "Response was not a valid object."
    };
  }

  const studySet = getStudySet(payload);

  if (!studySet) {
    return {
      valid: false,
      reason:
        "The server response did not contain a valid study set."
    };
  }

  if (!Array.isArray(studySet.cards)) {
    return {
      valid: false,
      reason:
        "Response had no valid 'cards' array."
    };
  }

  if (studySet.cards.length === 0) {
    return {
      valid: false,
      reason:
        "The study set contained zero cards."
    };
  }

  const cards = [];

  for (
    let index = 0;
    index < studySet.cards.length;
    index++
  ) {
    const raw = studySet.cards[index];

    if (
      !raw ||
      typeof raw !== "object"
    ) {
      return {
        valid: false,
        reason:
          `Card ${index + 1} was invalid.`
      };
    }

    if (!isNonEmptyString(raw.question)) {
      return {
        valid: false,
        reason:
          `Card ${index + 1} was missing a question.`
      };
    }

    if (!isNonEmptyString(raw.answer)) {
      return {
        valid: false,
        reason:
          `Card ${index + 1} was missing an answer.`
      };
    }

    if (
      !Array.isArray(raw.options) ||
      raw.options.length !== 4
    ) {
      return {
        valid: false,
        reason:
          `Card ${index + 1} must contain exactly 4 options.`
      };
    }

    if (
      !raw.options.every(isNonEmptyString)
    ) {
      return {
        valid: false,
        reason:
          `Card ${index + 1} contains an empty option.`
      };
    }

    const question =
      raw.question.trim();

    const answer =
      raw.answer.trim();

    const options =
      raw.options.map(
        (option) => option.trim()
      );

    if (!options.includes(answer)) {
      return {
        valid: false,
        reason:
          `Card ${index + 1}'s answer does not match any option.`
      };
    }

    cards.push({
      id:
        isNonEmptyString(raw.id)
          ? raw.id
          : `card-${index + 1}`,

      question,

      answer,

      options: shuffle(options)
    });
  }

  return {
    valid: true,

    data: {
      topic:
        isNonEmptyString(studySet.topic)
          ? studySet.topic.trim()
          : "Study set",

      cards
    }
  };
}