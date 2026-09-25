import { useEffect, useState } from "react";

export default function Quiz({ cards }) {
  const [pool, setPool] = useState(cards);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [wrongIds, setWrongIds] = useState([]);
  const [phase, setPhase] = useState("active"); // 'active' | 'results'
  const [isRetestRound, setIsRetestRound] = useState(false);

  // A fresh generation (new `cards` array) always starts a brand-new,
  // full-deck quiz — never carries over a stale pool or score.
  useEffect(() => {
    setPool(cards);
    setIndex(0);
    setSelected(null);
    setWrongIds([]);
    setPhase("active");
    setIsRetestRound(false);
  }, [cards]);

  if (pool.length === 0) return null;

  const current = pool[index];
  const isLast = index === pool.length - 1;

  function pickOption(option) {
    if (selected !== null) return; // already answered this question
    setSelected(option);
    if (option !== current.answer) {
      setWrongIds((prev) => [...prev, current.id]);
    }
  }

  function next() {
    if (isLast) {
      setPhase("results");
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  }

  function restartFull() {
    setPool(cards);
    setIndex(0);
    setSelected(null);
    setWrongIds([]);
    setPhase("active");
    setIsRetestRound(false);
  }

  function retestWrong() {
    const wrongCards = cards.filter((c) => wrongIds.includes(c.id));
    setPool(wrongCards);
    setIndex(0);
    setSelected(null);
    setWrongIds([]);
    setPhase("active");
    setIsRetestRound(true);
  }

  if (phase === "results") {
    const correctCount = pool.length - wrongIds.length;
    return (
      <div className="quiz-results">
        {isRetestRound && <p className="progress-label">Retest round</p>}
        <p>You scored</p>
        <p className="score">
          {correctCount} / {pool.length}
        </p>
        <div className="quiz-results-actions">
          {wrongIds.length > 0 && (
            <button className="btn btn-primary" onClick={retestWrong}>
              Retest {wrongIds.length} wrong answer{wrongIds.length > 1 ? "s" : ""}
            </button>
          )}
          <button className="btn btn-secondary" onClick={restartFull}>
            Restart full quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="progress-label">
        {isRetestRound ? "Retest — " : ""}Question {index + 1} of {pool.length}
      </p>
      <h3 className="quiz-question">{current.question}</h3>
      <div className="quiz-options">
        {current.options.map((option) => {
          let className = "quiz-option";
          if (selected !== null) {
            if (option === current.answer) className += " correct";
            else if (option === selected) className += " incorrect";
          }
          return (
            <button
              key={option}
              className={className}
              onClick={() => pickOption(option)}
              disabled={selected !== null}
            >
              {option}
            </button>
          );
        })}
      </div>
      <div className="quiz-footer">
        <span className="prompt-hint">
          {selected === null
            ? "Pick an answer"
            : selected === current.answer
            ? "Correct!"
            : `Not quite — correct answer is highlighted.`}
        </span>
        <button className="btn btn-primary" onClick={next} disabled={selected === null}>
          {isLast ? "See results" : "Next question →"}
        </button>
      </div>
    </div>
  );
}
