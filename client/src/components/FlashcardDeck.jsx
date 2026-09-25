import { useEffect, useState } from "react";

export default function FlashcardDeck({ cards }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // If the underlying deck changes (new generation), jump back to the start
  // instead of pointing at an index that may no longer exist.
  useEffect(() => {
    setIndex(0);
    setFlipped(false);
  }, [cards]);

  if (cards.length === 0) return null;

  const card = cards[index];

  function go(delta) {
    setFlipped(false);
    setIndex((i) => (i + delta + cards.length) % cards.length);
  }

  return (
    <div>
      <p className="progress-label">
        Card {index + 1} of {cards.length}
      </p>
      <div className="deck">
        <div
          className={`flashcard${flipped ? " flipped" : ""}`}
          onClick={() => setFlipped((f) => !f)}
          role="button"
          tabIndex={0}
          aria-label={flipped ? "Showing answer, click to show question" : "Showing question, click to show answer"}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setFlipped((f) => !f);
            }
          }}
        >
          <div className="flashcard-inner">
            <div className="flashcard-face front">
              <span className="eyebrow">Question</span>
              <p>{card.question}</p>
            </div>
            <div className="flashcard-face back">
              <span className="eyebrow">Answer</span>
              <p>{card.answer}</p>
            </div>
          </div>
        </div>
      </div>
      <p className="flashcard-hint">Click the card (or press Enter) to flip it</p>
      <div className="deck-controls">
        <button className="btn btn-secondary" onClick={() => go(-1)}>
          ← Previous
        </button>
        <button className="btn btn-secondary" onClick={() => go(1)}>
          Next →
        </button>
      </div>
    </div>
  );
}
