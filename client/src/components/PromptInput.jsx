import { useState } from "react";

const PLACEHOLDER =
  "Paste your notes, or just name a topic — e.g. 'the causes of World War I' or 'React useEffect cleanup functions'.";

const MAX_LEN = 6000;

export default function PromptInput({ onSubmit, isLoading }) {
  const [text, setText] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
  }

  return (
    <form className="prompt-form" onSubmit={handleSubmit}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={PLACEHOLDER}
        maxLength={MAX_LEN}
        aria-label="Notes or topic to turn into flashcards"
        disabled={isLoading}
      />
      <div className="prompt-form-row">
        <span className="prompt-hint">
          {text.length}/{MAX_LEN} characters
        </span>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading || !text.trim()}
        >
          {isLoading ? "Generating…" : "Generate flashcards"}
        </button>
      </div>
    </form>
  );
}
