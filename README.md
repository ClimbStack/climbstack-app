<div align="center">
  <img src="./assets/icon.png" width="120" style="border-radius: 24px; margin-bottom: 20px;" alt="ClimbStack Logo" />
  <h1>ClimbStack</h1>
  <p><b>Gamify your goals. Conquer your peaks.</b></p>

  <p>
    <a href="https://play.google.com/store/apps/details?id=com.gizano.levelup"><img src="https://img.shields.io/badge/Google_Play-414141?style=for-the-badge&logo=google-play&logoColor=white" alt="Google Play" /></a>
    <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native" />
    <img src="https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
    <img src="https://img.shields.io/badge/Open_Source-4CAF50?style=for-the-badge&logo=open-source-initiative&logoColor=white" alt="Open Source" />
    <a href="https://doi.org/10.5281/zenodo.22969593"><img src="https://img.shields.io/badge/DOI-10.5281%2Fzenodo.22969593-blue?style=for-the-badge&logo=zenodo&logoColor=white" alt="DOI" /></a>
    <a href="https://codecov.io/gh/ClimbStack/climbstack-app"><img src="https://img.shields.io/codecov/c/github/ClimbStack/climbstack-app?style=for-the-badge&logo=codecov&logoColor=white" alt="Codecov" /></a>
  </p>
  <p><i>An open-source productivity engine, built by developers, for everyone.</i></p>

  <p>
    <a href="https://play.google.com/store/apps/details?id=com.gizano.levelup">
      <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" height="70" />
    </a>
  </p>
</div>

ClimbStack is a mobile app for long-term goal tracking, built around the metaphor of **mountain climbing**: every goal is a peak to reach, every sub-goal is a base camp along the way. It includes a weekly planner to organize your week in blocks and eliminate _decision fatigue_.

> [!NOTE]
> Personal project born to solve a real problem: not knowing what to do in free time and ending up scrolling the phone. The app is the scaffolding — the real goal is to build the time-boxing habit until it becomes natural.

---

## ✨ Features

### MVP — Peaks and Camps

- **Peaks**: long-term goals (exams, Codeforces rating, personal projects)
- **Camps**: checkable sub-goals along the path to the peak
- **Visual progress**: SVG mountain path that fills up gradually
- **Streak**: consecutive days of activity counter
- **Celebrations**: visual feedback upon completing camps and peaks
- 🌗 **Light/Dark theme**: follows system preferences

### Weekly Planner _(Phase 2)_

- 📅 Precise weekly grid timeline syncable with Google Calendar
- 🧩 Dynamic duration overrides upon scheduling
- 🗃️ Accordion UI and Soft-delete Archives for blocks
- ⏱️ Target hours per category with progress bars
- 📋 Daily view "what should I do today"
- 📝 Sunday weekly review

---

## 🛠️ Tech Stack

| Layer          | Technology                               |
| -------------- | ---------------------------------------- |
| Framework      | [Expo](https://expo.dev/) (React Native) |
| Navigation     | Expo Router                              |
| Local Storage  | expo-sqlite / AsyncStorage               |
| SVG Graphics   | react-native-svg                         |
| Build & Deploy | EAS Build + GitHub Actions               |
| Language       | TypeScript                               |

---

## 🚀 Quick Start & Installation

### 📥 Install from Google Play

ClimbStack is officially in production on the Google Play Store for Android devices:

<p align="center">
  <a href="https://play.google.com/store/apps/details?id=com.gizano.levelup">
    <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" height="80">
  </a>
</p>

- **Package Name:** `com.gizano.levelup`
- **Google Play Link:** [Download on Google Play](https://play.google.com/store/apps/details?id=com.gizano.levelup)

---

### 💻 Local Development Setup

#### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- An Android device or emulator

### Installation

```bash
# Clone the repository
git clone https://github.com/ClimbStack/climbstack-app.git
cd climbstack-app

# Install dependencies
npm install

# Start in development mode
npx expo start
```

### Build APK

```bash
# Local build (requires Android SDK)
npx expo run:android

# Or cloud build via EAS
eas build --platform android --profile preview
```

### Installation from Release

1. Go to the [Releases](https://github.com/ClimbStack/climbstack-app/releases) page of the repository
2. Download the APK of the latest release
3. Transfer it to your phone and install it (enable "Install from unknown sources" if asked)

---

## 📁 Project Structure

```
climbstack-app/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # App screens
│   ├── store/          # State and data persistence
│   ├── types/          # TypeScript definitions
│   ├── utils/          # Utilities and helpers
│   └── assets/         # Images, fonts, icons
├── app/                # Expo Router (entry point and routing)
├── ROADMAP.md          # Detailed development plan
└── README.md
```

---

## 📐 Data Architecture

```typescript
interface Peak {
  id: string;
  name: string; // e.g. "1400 Codeforces Rating"
  description?: string;
  camps: Camp[];
  createdAt: Date;
  completedAt?: Date;
}

interface Camp {
  id: string;
  name: string; // e.g. "Solve 20 Div.2 A problems"
  done: boolean;
  completedAt?: Date;
  order: number; // position along the path
}

interface WeeklyBlock {
  id: string;
  name: string; // e.g. "Study OSTEP"
  category: string; // e.g. "study", "cp", "hobby"
  color: string;
  estimatedHours: number;
  peakId?: string; // optional link to a peak
}
```

---

## 🗺️ Roadmap

See [ROADMAP.md](./ROADMAP.md) for the complete development plan.

| Phase       | Content              | Status       |
| ----------- | -------------------- | ------------ |
| **Phase 0** | Project Setup        | 🟢 Completed |
| **Phase 1** | MVP: Peaks and Camps | 🟢 Completed |
| **Phase 2** | Weekly Planner       | 🟢 Completed |
| **Phase 3** | CI/CD and automation | 🟢 Completed |

---

## 🧪 Test Coverage

We are actively working to cover the entire application with automated tests. Help us make this sunburst graph completely green!

<p align="center">
  <a href="https://codecov.io/github/ClimbStack/climbstack-app">
    <img src="https://codecov.io/github/ClimbStack/climbstack-app/graphs/sunburst.svg?token=ZMK6BDH8WI" alt="Codecov Sunburst" width="600" />
  </a>
</p>

---

## 🤝 Community & Security

- **Open Source Philosophy**: ClimbStack is 100% open-source, built by developers for everyone. We believe in transparency and community-driven tools.
- **Code of Conduct**: Please refer to our [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) to understand the standards for participating in our community.
- **Security**: If you discover any security vulnerabilities, please check our [SECURITY.md](./SECURITY.md) for reporting guidelines.

## 📄 License

MIT

---

<p align="center">
  <i>Made with ☕ and AI by a computer science student aiming for ETH who didn't know what to do in his free time.</i>
</p>
