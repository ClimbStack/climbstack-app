# 🏔️ ClimbStack — Roadmap

> Personal side project. Timeboxed, AI-assisted, controlled scope.
> The goal is to have a working app on the phone, not to win a design award.

---

## Development Philosophy

- **Product Owner + Solutions Architect**: you define architecture and specs, AI generates UI code
- **Timebox per phase**: each phase has a budget of hours. If it overflows, cut scope, don't add time
- **Ship early, iterate later**: better an ugly app you actually use than a beautiful one you never finish

---

## Phase 0 — Project Setup `[~4h]`

- [x] Brainstorming and concept definition
- [x] Create GitHub repo
- [x] README and ROADMAP
- [x] Expo (React Native) project initialization
- [x] Folder structure (`/src`, `/components`, `/store`, `/assets`, etc.)
- [x] Linter + formatter setup (ESLint + Prettier)
- [x] First commit with working empty skeleton

**Deliverable**: `npx expo start` works, app shows an empty screen with "ClimbStack" name

---

## Phase 1 — MVP: Peaks and Camps `[~12-16h]`

The core of the app. Nothing else.

### 1.1 — Data model and persistence

- [x] Define data schema (`Peak`, `Camp`, metadata)
- [x] Local storage setup (`expo-sqlite` or `AsyncStorage` + JSON)
- [x] Full CRUD: create/edit/delete peaks and camps

### 1.2 — Main UI

- [x] Home screen: list of peaks with progress (bar or %)
- [x] Peak detail screen: list of camps with checkboxes
- [x] SVG mountain visualization with filling path (`react-native-svg`)
- [x] Aggregate stats: total altitude, peaks reached

### 1.3 — Basic Gamification

- [x] Streak counter (consecutive days of activity)
- [x] Visual feedback on camp completion (simple animation)
- [x] Visual feedback on peak completion (flag + celebration)

### 1.4 — Minimum Polish

- [x] Light/dark theme (follows system)
- [x] Smooth navigation between screens (Expo Router or React Navigation)
- [x] App icon and splash screen

**Deliverable**: Installable APK on phone. You can create peaks, check camps, see progress. Done.

---

## Phase 2 — Weekly Planner `[~10-14h]` ✅ COMPLETED

The time-blocking that solves the original problem: "I don't know what to do".

### 2.1 — Planner data model

- [x] Define `Block` (activity, category, estimated duration, color)
- [x] Define `WeeklySlot` (day, exact time slot)
- [x] Link blocks → gamification (completed hours = peak altitude)

### 2.2 — Planner UI

- [x] Weekly grid view with exact timeline
- [x] "Copy Week" function for predefined routines
- [x] Weekly target hours per category (editable progress bar)
- [x] Daily view: "what should I do today" — the screen you open in the morning

### 2.3 — External Synchronization

- [x] Native export to Google Calendar
- [x] Multi-calendar architecture for Google Calendar colors

**Deliverable**: you can plan the week on Sunday evening, and every morning you know what to do without thinking. Plus, you get Google notifications!

---

## Phase 3 — Automation and CI/CD `[IN PROGRESS 🏗️]`

### 3.1 — Automated Build

- [x] EAS Build config (free Expo account)
- [x] Push updated repository to GitHub remote
- [x] GitHub Action: on tag/release → build APK → attached to release

### 3.2 — Quality

- [x] Cleanup remaining deprecation warnings
- [x] Resolve any TS conflicts

**Deliverable**: pushing a tag on GitHub automatically generates a downloadable APK.

---

## Backlog — Future ideas (not planned, not promised)

> These features only exist here. Do not touch until Phase 2 is stable and used daily for at least 2 weeks.

- [ ] **Achievements/Badges**: Unlockable trophies every X meters climbed (e.g. "Everest Base Camp - 5364m", "Mont Blanc - 4809m")
- [ ] **Personal Inventory**: Track items, electronics, and important belongings (useful for keeping track of maintenance, warranties, etc.)
- [ ] **Onboarding Flow**: Initial setup questionnaire (with skip option) to configure default categories, first peaks, and weekly targets
- [ ] **Quality Assurance**: Integrate strict code quality checks (e.g., SonarCloud) into the CI pipeline to ensure long-term maintainability
- [ ] Native internal notifications/reminders for scheduled blocks (if Google Calendar isn't enough)
- [ ] Android widget for daily view
- [ ] Historical charts (progress over time, hours per week)
- [ ] Data export (JSON/CSV)
- [ ] **Internationalization (i18n)**: Community-driven translations for major global languages (Mandarin, Spanish, German, French) once the userbase grows
- [ ] **Local Privacy-First AI Assistant**:
  - Integrate `onnxruntime-react-native` to run 1B-3B quantized LLMs (e.g., Llama-3.2-1B-Instruct) entirely on-device, zero internet connection required.
  - **Dynamic Model Download**: Model is fetched via `expo-file-system` after installation to keep the base APK size minimal.
  - **Camp Generator**: Automatically breaks down large Peaks into 5 actionable Camps and directly parses the JSON output into the local SQLite store.
  - **Decision Fatigue Savior**: Analyzes daily free time, current streak, and uncompleted WeeklyBlocks to suggest the single best task to start right now.
  - **Weekly AI Review**: Simple RAG over `expo-sqlite` history to summarize accomplishments and hype up upcoming tasks.

---

## Anti-patterns to avoid

| ❌ Don't                                    | ✅ Do instead                                       |
| ------------------------------------------- | --------------------------------------------------- |
| Add features to backlog during active phase | Write them on a post-it and ignore until phase ends |
| Perfect UI before logic works               | Ship ugly, polish later                             |
| Spend more than 30 mins on a CSS bug        | Ask AI, accept result, move on                      |
| Compare app to Todoist/Notion/TickTick      | This app solves **your** problem, not everyone's    |
| Work on it when you should study            | Never during Deep Work blocks                       |

---

_Last update: September 2026_
