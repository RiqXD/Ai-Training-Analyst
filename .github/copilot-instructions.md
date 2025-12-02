## Repo snapshot — quick context

- Framework: Next.js 14 (App Router). Code lives in `app/` (server + client React). Entry points: `app/layout.tsx`, `app/page.tsx`.
- Language: TypeScript. Path alias `@/*` -> project root (see `tsconfig.json`).
- Styling: Tailwind (see `tailwind.config.ts`, `styles/globals.css`).
- UI primitives: `components/ui/*` (card, button, table, dialog, badge). Import with `@/components/ui/...`.
- Charts: `recharts` is used for visualizations (see `components/TeacherDashboard.tsx`).

## Big-picture architecture for an AI agent

- Frontend (client) components call a local server API route to perform LLM requests. Example: `components/TeacherDashboard.tsx` builds a body (via `makeOpenRouterBody`) and fetches `/api/ai-analyze`.
- Server proxy: `app/api/ai-analyze/route.ts` forwards the incoming JSON to OpenRouter (`https://openrouter.ai/api/v1/chat/completions`) using `process.env.OPENROUTER_API_KEY`.
- Data flow: UI -> POST `/api/ai-analyze` -> OpenRouter -> server returns raw response text -> frontend parses choices[0].message.content as JSON.

## Key files to reference when editing AI behavior

- `components/TeacherDashboard.tsx` — client example that:
  - prepares the `messages` (system + user) and the overall `model`, `temperature` and `response_format`.
  - expects the LLM output as a JSON string, then does `JSON.parse(content)`.
  - uses `fetch('/api/ai-analyze', { method: 'POST', body: JSON.stringify(body) })`.
- `app/api/ai-analyze/route.ts` — server-side proxy. Important: it reads the request body and forwards it to OpenRouter with the `OPENROUTER_API_KEY` env var.

## Project-specific conventions and patterns

- Keep AI prompt/output strict and machine-readable. The project expects LLM outputs to be a JSON string (see `output_format` in `makeOpenRouterBody`).
- Low temperature for deterministic results: `temperature: 0.2` is used in the example.
- Frontend uses client components (`"use client"`) to call APIs. Keep parsing/validation defensive (see `analyzeWithOpenRouter` usage and fallback text).
- UI composition: prefer `components/ui/*` primitives instead of ad-hoc markup.
- Types inline: `Teacher` type is declared in `TeacherDashboard.tsx`. If you introduce new shared types, add them under a `types/` or `lib/` file and import with `@/` alias.

## Developer workflows (commands that matter)

- Install: `npm install`
- Env: copy and populate `.env.example` -> `.env.local`. Required: `OPENROUTER_API_KEY` (used in `app/api/ai-analyze/route.ts`).
- Dev server: `npm run dev` (Next dev on http://localhost:3000). The README recommends visiting `/teachers`.
- Build: `npm run build` and `npm run start` for production.
- Lint: `npm run lint`.

## Integration & safety notes

- The server proxy simply forwards the request body to OpenRouter and returns the text response. The frontend performs JSON.parse on `choices[0].message.content`. Keep the `response_format` stable so the frontend parsing remains robust.
- Sanitize and validate before parsing: any change to the LLM prompt/output contract must also update frontend parsing and error handling.

## Known gotchas discovered in repo

- In `app/api/ai-analyze/route.ts`, the Content-Type header string is broken across lines:
  - Broken: `"Content-Type": "application/\n      json"`
  - Fix: `"Content-Type": "application/json"`
  This will cause runtime request headers to be invalid.
- The backend attaches `HTTP-Referer: http://localhost:3000` and `X-Title` headers — these are safe for local dev but review before production.

## Quick examples you can use or edit

- Example: change the system instruction in `makeOpenRouterBody` (see `components/TeacherDashboard.tsx`) to adjust analysis style.
- When returning structured data from the LLM, keep the top-level response a JSON object string. The frontend expects keys: `analysis` and `sentiments` (positive/neutral/negative).

## If you're editing or adding AI routes

- Mirror the shape used by `makeOpenRouterBody` and clearly document any changes to `response_format`.
- Add tests or a small validator that asserts the returned string is parseable JSON and contains required keys before the component attempts to parse and use it.

If anything here is unclear or you want examples for another file (for example, adding a new AI endpoint or changing prompt format), tell me which file and I'll expand the guidance.
