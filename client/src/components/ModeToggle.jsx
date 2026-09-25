export default function ModeToggle({ mode, onChange }) {
  return (
    <div className="mode-toggle" role="tablist" aria-label="Study mode">
      <button
        role="tab"
        aria-selected={mode === "flashcards"}
        className={mode === "flashcards" ? "active" : ""}
        onClick={() => onChange("flashcards")}
      >
        Flashcards
      </button>
      <button
        role="tab"
        aria-selected={mode === "quiz"}
        className={mode === "quiz" ? "active" : ""}
        onClick={() => onChange("quiz")}
      >
        Quiz
      </button>
    </div>
  );
}
