const FRIENDLY_MESSAGE = {
  TIMEOUT: "That took too long. The model may be overloaded — try again.",
  NETWORK: "Couldn't reach the server. Check that it's running and try again.",
  BAD_INPUT: null, // server message is already specific and safe to show as-is
  BAD_SHAPE: "The model's response didn't match the shape we expected. Try again.",
  PARSE: "The model returned something that wasn't valid JSON. Try again.",
  EMPTY: "The model returned nothing. Try again, maybe with a bit more detail.",
  UPSTREAM: "The model provider had a problem. Try again in a moment.",
  CONFIG: null, // server message tells the developer exactly what's missing
  UNKNOWN: "Something went wrong. Try again.",
};

export default function ErrorState({ error, onRetry }) {
  const message = FRIENDLY_MESSAGE[error?.code] ?? error?.message ?? "Something went wrong.";
  const shown = message || error?.message || "Something went wrong.";

  return (
    <div className="status-block error" role="alert">
      <p>{shown}</p>
      {error?.code && (
        <p className="status-detail">Error code: {error.code}</p>
      )}
      <div style={{ marginTop: "0.85rem" }}>
        <button className="btn btn-secondary" onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  );
}
