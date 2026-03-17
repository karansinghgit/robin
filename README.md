# Robin

Robin is a mac-first menu bar sidekick built with Electron. V1 focuses on two workflows:

- `Search`: BYOK Perplexity-powered web-grounded answers
- `Local`: Ollama-backed local chat

## Stack

- Electron `41.0.2`
- Electron Forge `7.10.2`
- React + TypeScript
- Tailwind CSS

## Setup

1. Install Node.js `22+`.
   If you do not use Homebrew or nvm, you can bootstrap a local copy:

```bash
bash ./scripts/bootstrap-node.sh
```

2. Install dependencies:

```bash
npm install
```

3. Start the app:

```bash
npm start
```

4. Typecheck before packaging:

```bash
npm run typecheck
```

## Common Commands

```bash
make help
make setup
make dev
make test
make package
make install
make clean-dev
make create-release VERSION=0.1.0
```

If you prefer npm directly:

```bash
npm run setup
npm run dev
npm run test
npm run package:mac
npm run make:mac
npm run install:mac
```

`make dev` now auto-stops stale Robin dev processes and picks free Forge ports, so reruns are safe even after interrupted sessions.
In dev mode, Robin also forces `hide-on-blur` off and sets a tray title fallback so it stays visible while we iterate.

Node is pinned in [.nvmrc](/Users/karansingh/projects/robin/.nvmrc) and [.node-version](/Users/karansingh/projects/robin/.node-version).
After bootstrap, the repo-level wrappers [scripts/nodew](/Users/karansingh/projects/robin/scripts/nodew) and [scripts/npmw](/Users/karansingh/projects/robin/scripts/npmw) will use the local runtime automatically.

## Testing

Robin currently has a strong smoke-test workflow rather than a full automated test suite.

1. Run `npm install`
2. Run `npm run test`
3. Run `npm run dev`
4. Verify manually:
   - Tray icon appears
   - `CommandOrControl+Shift+Space` toggles the panel
   - `Esc` hides the panel
   - Onboarding allows Perplexity key entry
   - Ollama detection reports the correct state
   - Search mode streams a response after you configure a valid Perplexity key
   - Local mode streams a response when Ollama is running with a pulled model
   - Quit and relaunch the app; conversations should still be there

For a true clean-room retest on macOS:

```bash
make clean-dev
make dev
```

## Product Notes

- macOS is the primary UX target in v1.
- No hosted inference subsidy is included.
- The app stores conversations in local JSON files under Electron's user data directory.
- API keys are encrypted with Electron `safeStorage`.

## Packaging

```bash
make make
```

This creates distributable artifacts in `out/`.

## Releasing

Robin now has a SpeakType-style release flow:

1. Export Apple signing env vars:

```bash
export APPLE_SIGN_IDENTITY="Developer ID Application: Your Name (TEAMID)"
export APPLE_ID="you@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="TEAMID"
```

You can also copy values from [.env.release.example](/Users/karansingh/projects/robin/.env.release.example).

2. Prepare the release locally:

```bash
make create-release VERSION=0.1.0
```

3. Publish it to GitHub Releases:

```bash
make deploy-release VERSION=0.1.0
```

4. Or do both:

```bash
make release VERSION=0.1.0
```

For the full checklist, see [RELEASING.md](/Users/karansingh/projects/robin/RELEASING.md).

## Next Steps

- Add real renderer/main-process automated tests
- Add a richer settings surface for provider management
- Add update distribution after the first beta
