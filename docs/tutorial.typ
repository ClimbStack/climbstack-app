#set page(paper: "a4", margin: 2.5cm)
#set text(font: "Linux Libertine", size: 12pt)
#set par(justify: true)

#align(center)[
  #text(size: 28pt, weight: "bold")[ClimbStack]
  
  #v(1em)
  #text(size: 16pt)[User Manual & Full Tutorial]
  
  #v(2em)
  *GiZano* \
  #text(style: "italic")[Open Source Edition]
]

#v(4em)

= 1. Introduction
ClimbStack is a React Native application built to defeat *decision fatigue*. It combines gamified long-term goals with strict weekly time-blocking. Instead of constantly wondering "What should I do today?", ClimbStack provides a clear, actionable dashboard based on your predefined weekly routine.

This document serves as both a comprehensive guide for new users during testing sessions and a technical reference for contributors.

#pagebreak()

= 2. Quick Start: The ClimbStack Methodology

The core philosophy of ClimbStack is bridging the gap between grand ambitions and daily execution. To do this, we use the mountain metaphor.

== 2.1 Peaks & Camps (The "What")
A *Peak* represents a major, long-term goal (e.g., "Pass the OS Exam", "Launch a Startup"). Because Peaks are daunting, they must be broken down into *Camps* (milestones). Every time a camp is reached, you gain 100 meters of altitude, creating a gamified sense of progression.

== 2.2 Activity Blocks (The "How")
To reach camps, you need to put in the hours consistently. *Blocks* are scheduled activities mapped to specific categories (e.g., Study, Work, Hobby). Every block completed adds 1 meter of altitude per hour to your historical stats.

---

= 3. Step-by-Step Tutorial

== Step 1: Define Your First Peak
1. Open the *Home* tab.
2. Tap the floating action button (`+`) in the bottom right corner.
3. Enter a name for your Peak (e.g., "Learn React Native") and an optional description.
4. Tap *Create*.
5. Tap on the newly created Peak to open its detail screen. Here, add your *Camps* (e.g., "Learn Hooks", "Build UI", "Publish App").

== Step 2: Set Up Categories
1. Navigate to the *Manage Blocks* screen (accessible from the Settings tab or Planner header).
2. Tap the `+` button and select *Categoria*.
3. Choose an Emoji, a Name, a Color, and set your *Target Hours per Week*. 
4. The system will automatically calculate how many hours you have left out of your 168 weekly hours.

== Step 3: Create Block Templates
1. In the same *Manage Blocks* screen, tap the `+` button and select *Blocco*.
2. Name the specific activity (e.g., "Deep Work: React Native").
3. Assign it to the Category you just created and select a *default* duration (e.g., 2 hours).
4. *Tip:* Block templates are grouped by category using a clean accordion UI. Tap the `▶` icon next to a category to expand and view its blocks.
5. *Tip:* You can soft-delete (Archive) categories or blocks using the 📦 icon. They will be moved to the *Archive* section at the bottom of the page, where you can restore them (♻️) at any time.

== Step 4: Plan Your Week
1. Go to the *Planner* tab.
2. You will see a 7-day grid representing the current week.
3. Tap any empty slot (`+`) under a day to open the Template Picker.
4. Expand a category and tap a block template. 
5. Select a *Start Time* and *override the duration* if needed for that specific day (e.g., changing a 2h default reading block to 0.5h for today only).
6. Tap "Conferma" to add it to your timeline.
7. As you schedule blocks, watch the category progress bars at the top fill up towards your weekly target.

== Step 5: Execute (The Daily View)
1. Every morning, open the *Today* tab.
2. You will see exclusively the blocks scheduled for the current day, sorted by time. No distractions, no planning required.
3. As you complete an activity, tap the checkbox. The block will be crossed out, your daily progress bar will fill up, and your global altitude will increase.

---

= 4. Gamification & Analytics

ClimbStack uses subtle gamification to keep you engaged:
- *Altitude*: Earned by completing Camps (100m) and Blocks (1m/hour). Tap the "Total Altitude" card on the Home screen to view a historical breakdown of meters climbed per category and per peak.
- *Peaks Reached*: Tracks fully completed goals. Tap this card to see a list of completed and in-progress peaks with exact completion percentages.
- *Streaks*: Your consecutive days of activity. Do at least one block a day to keep the fire alive!

---

= 5. Settings & Data Management

ClimbStack is fully offline and privacy-first.
- *Backup*: From the Settings tab, you can export all your data (Peaks, Blocks, Categories) into a single `.json` file and share it via Google Drive or Email. You can also import a backup to restore your data on a new device.
- *Localization*: Change the language (English/Italian) on the fly without restarting the app.

#pagebreak()

= 6. Technical Architecture

ClimbStack is designed to be fully offline, privacy-first, and lightning-fast.

- *Frontend Framework*: React Native (via Expo Managed Workflow).
- *Language*: TypeScript.
- *Local Storage*: `AsyncStorage` for simple key-value pairs (like weekly plans) and `expo-sqlite` for structured relational data.
- *State Management*: Pure React Context (`PeaksContext`, `PlannerContext`). No external bloat.

= 7. Open Source Contribution

ClimbStack strongly embraces *Agent-Driven Development*. We encourage contributors to utilize AI tools (like Copilot, Claude, or Antigravity) to write boilerplate, fix bugs, and scaffold features. 

Please read the `AGENTS.md` and `CONTRIBUTING.md` files in the repository root for specific instructions on how to prompt your AI assistant and structure your Pull Requests for this codebase.
