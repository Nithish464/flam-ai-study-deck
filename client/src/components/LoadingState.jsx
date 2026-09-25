export default function LoadingState() {
  return (
    <div className="status-block loading" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p>Generating your flashcards…</p>
      <p className="status-detail">This usually takes a few seconds.</p>
    </div>
  );
}
