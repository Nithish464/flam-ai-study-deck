# Study Deck

A small React app that turns free-form notes or a topic into an interactive
flashcard deck and quiz — built for the Flam frontend internship assignment
("Study assistant" option).

You type or paste text once. An LLM turns it into structured JSON (a set of
question/answer/options cards). The app parses that JSON and renders it as
real, stateful UI: cards you flip, a multiple-choice quiz you take, and a
retest flow for whatever you got wrong. There's no chat box anywhere — the
model's raw text never reaches the screen unparsed.

## How it's built

```
flam-frontend-assignment/
├── client/                  # Vite + React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── PromptInput.jsx     # the free-form text input
│   │   │   ├── ModeToggle.jsx      # Flashcards / Quiz switch
│   │   │   ├── FlashcardDeck.jsx   # flip-through cards
│   │   │   ├── Quiz.jsx            # multiple-choice quiz + retest-wrong flow
│   │   │   ├── LoadingState.jsx
│   │   │   ├── ErrorState.jsx      # shared error + retry UI
│   │   │   └── EmptyState.jsx
│   │   ├── lib/
│   │   │   ├── api.js              # the only place that calls the backend
│   │   │   └── validateResult.js   # shape-checks the response before it's used
│   │   └── App.jsx                 # state machine + stale-response guard
│   └── vite.config.js       # dev-proxies /api to the backend
└── server/                  # Express proxy — holds the API key
    ├── index.js             # POST /api/generate, input + shape validation
    └── generate.js          # the prompt, the model call, first-pass parsing
```

**Why a backend at all?** The API key can't live in the browser bundle — the
`server/` workspace is a small Express app whose only job is to hold the key,
call the model, and hand back JSON. The frontend never sees the key and
never calls the model provider directly.

**The data shape.** Every generation returns:

```json
{
  "topic": "Photosynthesis",
  "cards": [
    {
      "id": "card-0-abc123",
      "question": "What pigment absorbs light for photosynthesis?",
      "answer": "Chlorophyll",
      "options": ["Chlorophyll", "Keratin", "Melanin", "Hemoglobin"]
    }
  ]
}
```

The same `cards` array powers both modes: `FlashcardDeck` uses `question` /
`answer`, `Quiz` additionally uses `options` for multiple choice.

## Setup

Requires **Node 18+** (for global `fetch`) and **npm 7+** (for workspaces).

```bash
npm install
cp server/.env.example server/.env
# then edit server/.env and add your ANTHROPIC_API_KEY
npm start
```

`npm start` runs both the backend (port 3001) and the Vite dev server
(port 5173) together. Open **http://localhost:5173**.

To run them separately instead:

```bash
npm run dev:server   # http://localhost:3001
npm run dev:client   # http://localhost:5173
```

### Using a different provider

The app defaults to the Anthropic API, but any provider works — `server/generate.js`
is the only file that talks to the model. Swap the `fetch` call in there for
your provider's API (OpenAI, Gemini, Groq, OpenRouter, or a local Ollama
endpoint), keep the prompt asking for the same JSON shape, and keep the
function signature (`generateStudySet(topic) -> Promise<object>`) the same —
nothing else needs to change. Model names change over time; check your
provider's current docs rather than trusting a hardcoded default.

## Handling bad AI output

This was the main point of the assignment, so here's what's actually
implemented and where:

| Failure mode | Where it's caught | What happens |
|---|---|---|
| Malformed JSON | `server/generate.js` (`JSON.parse` in a try/catch, after stripping accidental code fences) | Server returns `502 { error: { code: "PARSE" } }`; UI shows an error state with retry |
| Wrong shape (valid JSON, missing/wrong fields) | Checked **twice**, independently: `server/index.js` (`isValidStudySet`) and again client-side in `lib/validateResult.js` | Either layer catching it routes to the same error state — the client never trusts the server blindly |
| Empty response | `server/generate.js` checks for empty text before attempting to parse | `502 { code: "EMPTY" }` |
| Slow response | Both the server (`AbortController`, 30s) and the client (`AbortController`, 35s) time out independently | `504`/`TIMEOUT` → error state, not an infinite spinner |
| Failed request (network, non-2xx, provider down) | `client/src/lib/api.js` catches fetch failures and non-`ok` responses | Error state with a specific, human-readable message and a retry button |
| Stale response overwriting a newer one | `App.jsx` — a `requestId` ref is incremented on every new generation; a response is only applied if its captured id still matches the current one; the previous in-flight request is also `abort()`-ed | Firing a second generation while the first is slow can never let the first one win |

No error state ever crashes the app or silently renders nothing — every
failure path lands on `ErrorState` with a specific message and a "Try
again" button that re-runs the exact same request.

## AI usage note

I used Claude to scaffold this project: generating the initial file
structure, the Express proxy, the shape-validation logic, and the flip-card
CSS animation, then hand-edited and tested everything (the stale-response
guard, the retest-wrong-answers flow in `Quiz.jsx`, and the error-code
mapping were iterated on directly rather than accepted as first drafts). I
did not paste in an existing solution to this assignment — everything here
was generated for and adapted to this specific brief.

## Known limitations

- No streaming — the full set of cards arrives in one response rather than
  appearing incrementally.
- No follow-up refinement loop (e.g. "make it harder", "add 3 more cards")
  — regenerating means a fresh full request.
- No persistence — reloading the page loses the current deck; there's no
  save/reload of past sessions.
- The server does one attempt at generation; on a parse failure it surfaces
  an error to the user rather than automatically retrying the model call
  itself (the user's own "Try again" click re-runs it).
- Quiz option order is shuffled once per card on the client and then held
  stable for that session, but is not re-randomized between quiz attempts
  within the same generation.

## Time spent

About 7.5 hours: ~1 hour designing the data shape and prompt, ~2 hours on
the backend proxy and validation/error paths, ~3.5 hours on the React
components and styling, ~1 hour writing this README and testing failure
paths manually (killing the server mid-request, feeding it a deliberately
short/vague topic, throttling the network in devtools).
