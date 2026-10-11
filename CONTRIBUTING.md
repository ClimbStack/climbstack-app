# Contributing to ClimbStack 🏔️

First off, thank you for considering contributing to ClimbStack! It's people like you that make the open-source community such a great place to learn, inspire, and create.

## How to Contribute

1. **Fork & Clone**: Fork the repository on GitHub and clone it to your local machine.
2. **Branch**: Create a new branch for your feature or bugfix (`git checkout -b feat/your-feature` or `fix/your-fix`).
3. **Develop**: Write your code. Make sure to adhere to the coding guidelines below.
4. **Test**: Ensure the app builds locally and your changes don't break existing functionality.
5. **Commit**: Use Conventional Commits (e.g., `feat: add new block type`, `fix: resolve crash on peaks screen`).
6. **Push & PR**: Push your branch to your fork and open a Pull Request against the `main` branch of ClimbStack.

## Local Development Setup

Ensure you have Node.js and npm installed.

```bash
# Install dependencies
npm install

# Start the Expo development server
npx expo start
```

Use the Expo Go app on your phone, or an Android/iOS emulator to test your changes.

## Coding Guidelines

- **Language**: TypeScript is mandatory. Do not use plain JavaScript.
- **Styling**: Use the centralized theme (`src/utils/theme.ts`) for colors, spacing, and typography.
- **i18n**: All user-facing strings must be routed through `src/utils/i18n.ts`. Do not hardcode strings in the UI.
- **State**: Use the existing React Contexts (`PeaksContext`, `PlannerContext`). Do not introduce external state management libraries (like Redux) without discussing it first in an Issue.

## Issues

Before opening a PR for a major feature, please check the issues tab to see if it's already being worked on, or open a new issue to discuss your proposed changes.

## Community and Communication

We believe in open and active communication. If you want to discuss a new feature, a bug fix, or just need help getting started:

- Join our **GitHub Discussions** tab to talk about features, architecture, and user feedback.
- We highly value open-source culture and aim to create a welcoming environment for both veteran engineers and university students looking to make their first open-source contribution.

## Good First Issues

If you are new to the codebase, look for issues labeled `good first issue` or `help wanted`. These are specifically curated to be self-contained and require minimal knowledge of the entire system architecture.

## Modular Architecture

ClimbStack strictly follows a modular architecture (inspired by large-scale projects like SymPy). When contributing, please ensure your code is isolated to its specific domain:

- `src/store/`: Core logic, SQLite interactions, and React Context state.
- `src/components/`: Dumb, reusable UI components (e.g., SVG charts, buttons).
- `src/screens/`: Screen-level orchestration.
- `src/utils/`: Isolated helpers (e.g., i18n, stats calculations).
  Future modules (like Local AI logic) must be placed in their own isolated domain (e.g., `src/ai/`) so they can be maintained or replaced without side effects on the rest of the application.

## Versioning Policy

ClimbStack follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`):

| Bump                | When                                                                                                                | Example  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- | -------- |
| **PATCH** (`x.x.Y`) | Bug fixes, typos, small UI corrections. Released immediately.                                                       | `v1.0.1` |
| **MINOR** (`x.Y.0`) | New self-contained features (e.g., Achievements, new settings). Released after a batch of regular issues is merged. | `v1.1.0` |
| **MAJOR** (`X.0.0`) | An Epic feature lands. Released when the entire Epic branch is complete, tested, and merged into `main`.            | `v2.0.0` |

## Epic Workflow

Issues labeled `epic` represent large, multi-step features that span multiple PRs. They follow a strict workflow:

1. **Epic Branch**: A long-lived branch is created from `main` with the name `epic/<feature-name>` (e.g., `epic/local-ai-chatbot`).
2. **Sub-issues**: The Epic issue contains a checklist of sub-issues. Each sub-issue is worked on in its own short-lived branch created _from the Epic branch_ (e.g., `epic/local-ai-chatbot/step-1-model-selection`).
3. **Sub-PRs**: Each sub-issue is merged into the Epic branch via a PR. These PRs are reviewed and tested individually.
4. **No partial merges**: The Epic branch is **never** merged into `main` until _all_ sub-issues are resolved and the feature is fully functional end-to-end.
5. **Final merge**: Once all sub-issues are closed and the Epic branch passes CI, a single PR is opened from the Epic branch into `main`. This triggers a **MAJOR** version bump.

```
main ─────────────────────────────────●── v2.0.0
       \                             /
        epic/feature ───●───●───●───●
                       s1  s2  s3  s4
```

This ensures `main` is always stable and releasable, while large features are developed in parallel without blocking regular development.
