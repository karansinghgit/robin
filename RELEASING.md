# Releasing Robin

Robin uses a SpeakType-style release flow:

1. verify the repo is clean
2. bump the app version
3. run the test gate
4. build mac artifacts
5. optionally sign and notarize
6. commit and tag locally
7. publish artifacts to GitHub Releases

## Prerequisites

- Node.js `22+`
- `npm install`
- `gh auth login`
- Apple Developer credentials if you want a signed/notarized mac build

## Apple Signing Env Vars

Export these before `make create-release`:

```bash
export APPLE_SIGN_IDENTITY="Developer ID Application: Your Name (TEAMID)"
export APPLE_ID="you@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="TEAMID"
```

If these are not set, the release scripts still build artifacts, but they will be unsigned and not notarized.

## Recommended Local Test Pass

```bash
make setup
npm install
make test
make dev
```

Manual checks:

- tray icon appears
- tray click toggles the panel
- default shortcut toggles the panel
- `Esc` hides the panel
- onboarding works in both Search and Local paths
- Perplexity search streams when a valid key is present
- Ollama detection handles not installed / not running / no model / ready
- chat history persists after relaunch

## Prepare a Release

```bash
make create-release VERSION=0.1.0
```

This script:

- validates the working tree
- bumps `package.json`
- runs `npm run test`
- runs `npm run make:mac`
- creates a local commit and tag
- leaves artifacts in `out/make/`

## Publish a Release

```bash
make deploy-release VERSION=0.1.0
```

This script:

- pushes the current branch
- pushes the version tag
- uploads `.dmg` and `.zip` artifacts from `out/make/` to GitHub Releases

## One-Step Release

```bash
make release VERSION=0.1.0
```
