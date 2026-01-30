# Repository Guidelines

## Project Structure & Module Organization
- Entry points live at the repo root: `index.html` (HTML shell), `index.tsx` (React mount), and `App.tsx` (main UI).
- Shared domain definitions are in `types.ts` and UI constants in `constants.tsx`.
- External integrations are grouped under `services/` (e.g., `services/geminiService.ts`).
- Tooling/config files include `vite.config.ts`, `tsconfig.json`, and `package.json`. Metadata lives in `metadata.json`.

## Build, Test, and Development Commands
- `npm install` — install dependencies.
- `npm run dev` — start the Vite dev server (configured for port 3000).
- `npm run build` — build the production bundle.
- `npm run preview` — serve the production build locally for verification.

## Coding Style & Naming Conventions
- TypeScript + React with functional components and hooks.
- Use 2-space indentation and semicolons (matches existing files).
- Naming: `PascalCase` for components/types, `camelCase` for functions/variables, and `SCREAMING_SNAKE_CASE` for constants.
- React files use `.tsx`; keep utility class strings inside `className` in JSX.

## Testing Guidelines
- No test framework or test scripts are currently configured in `package.json`.
- If you add tests, prefer `*.test.tsx` naming and document the test command (e.g., add `npm test`).
- No coverage requirements are defined yet.

## Commit & Pull Request Guidelines
- This checkout does not include Git history, so there is no enforced commit convention.
- Suggested commit style: short, imperative subject (e.g., “Add punch history view”).
- PRs should include a concise summary, run instructions, and UI screenshots when visuals change.

## Security & Configuration Tips
- Create `.env.local` with `GEMINI_API_KEY` for local Gemini access; never commit secrets.
- User and punch data are stored in Firestore; there are no local `localStorage` saves.
