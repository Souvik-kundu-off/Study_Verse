# 🚀 StudyVerse AI Learning OS — Feature History & Master Roadmap

This document serves as the **official project ledger** tracking all implemented features, database migrations, and upcoming technical phases for **StudyVerse**.

---

## 📌 Executive Summary & Architectural Overview

```
                                ┌────────────────────────────────────────┐
                                │        StudyVerse Master Engine        │
                                └───────────────────┬────────────────────┘
                                                    │
        ┌───────────────────────┬───────────────────┴───────────────────┬───────────────────────┐
        ▼                       ▼                                       ▼                       ▼
 ┌──────────────┐    ┌───────────────────┐                   ┌───────────────────┐   ┌───────────────────┐
 │ Multi-Subject│    │  Grounded RAG     │                   │ Cognitive Analytics│   │ Accessibility &   │
 │ Parallel Tracks    │  & Material Gen   │                   │ & SRS Scheduling  │   │ Equity Engine     │
 └──────────────┘    └───────────────────┘                   └───────────────────┘   └───────────────────┘
   [COMPLETED]           [COMPLETED]                             [UPCOMING]              [UPCOMING]
```

---

## ✅ SECTION 1: IMPLEMENTED FEATURES & COMPLETED PHASES

### 🚩 Phase 1: Multi-Subject Parallel Tracks & Focus Workspace (Completed)
- [x] **Multi-Subject Track Engine**: Students can create and manage multiple active study tracks simultaneously (*e.g., DSA at Night, Physics in the Morning*).
- [x] **Syllabus & Course Material Ingestion**: Onboarding and track creation flow allows pasting raw syllabus text, lecture outlines, or exam dates.
- [x] **Chronotype Time-Slot Preferences**: Support for selecting preferred time slots (`morning`, `afternoon`, `evening`, `night`, `flexible`) with custom UI badges on the dashboard.
- [x] **Subject Switcher & Dynamic Dashboard**: Quick-switch active tracks directly from the mission dashboard with instant progress tracking.
- [x] **Publication-Grade Typography Engine (`FormattedText.tsx`)**:
  - Strips raw markdown syntax (`####`, `**`, `+`, `*`) into structured UI section cards, callouts, and clean headings.
- [x] **Dual-Mode Interactive Flashcard Deck (`FlashcardDeck.tsx`)**:
  - **Grid View Mode**: Renders 4–6 high-contrast gradient cards on one screen simultaneously with individual flip animations.
  - **Single Focus Deck Mode**: 3D flip active-recall card deck for deep focus.
- [x] **Distraction-Free Fullscreen Focus Workspace**:
  - Automatically triggers browser full-screen focus mode on starting a lesson.
  - Manual fullscreen toggle button in session header.
  - Separate AI Lesson Guide vs. Private Student Notebook (with **Save**, **Export .txt**, and **Clear** actions).
- [x] **Clean Brand Identity**: Replaced generic AI sparkles with custom domain icons (`GraduationCap`, `BookOpen`, `Bot`, `Zap`, `BrainCircuit`) and custom StudyVerse SVG favicon.

---

### 🧠 Phase 2: Grounded RAG Pipeline & Visual Flowcharts (Completed)
- [x] **Vector Database Architecture (`document_chunks`)**:
  - Database migration (`20260731020000_rag_document_chunks.sql`) with Supabase RLS security policies and similarity search RPC (`match_document_chunks`).
- [x] **RAG Retrieval Engine (`rag.server.ts`)**:
  - Server-side document chunking service (500-character overlapping chunks) with vector embeddings.
  - Grounded similarity retrieval (`getGroundedContext`) for AI prompts.
- [x] **Grounded Source Page Citations**:
  - AI Lesson Guides, Flashcards, and Quizzes query `document_chunks` first, attaching exact page/section citations (*e.g., `[Source: Chapter 3 Notes.pdf, Page 2]`*).
- [x] **Course Material Upload Panel**:
  - Direct textbook / slide text ingestion card in the Focus Session Resources tab.
- [x] **Mermaid.js Visual Concept Maps (`MermaidDiagram.tsx`)**:
  - Dynamic client-side rendering of visual flowcharts and mindmaps directly inside lesson notes.
  - Built-in syntax validation, error suppression, and clean fallback rendering.

---

### 🎓 Phase 2.5: Official University Courses & Instructor PDF Personalization (Completed)
- [x] **RBAC Database Migration (`20260801000000_rbac_courses_enrollments.sql`)**:
  - `profiles.role` (`'student'`, `'instructor'`, `'admin'`).
  - `courses` & `course_enrollments` tables.
- [x] **Courses Directory (`courses.tsx`)**:
  - Universal course catalog for all learners with category pills.
  - 1-click enrollment for students.
- [x] **Instructor Course Creator Modal**:
  - Teachers/Admins can publish courses and ingest syllabus text & PDF textbooks into RAG vector store.

---

### 🛡️ Phase 2.8: Platform Admin Console & AI Engine Control Center (Completed)
- [x] **System Settings Migration (`20260801010000_system_settings.sql`)**:
  - Key-value schema persisting AI model, RAG match threshold, match count, maintenance mode, and announcements.
- [x] **Admin Server Functions (`admin.functions.ts`)**:
  - Telemetry counters, User Directory queries, 1-click role promotions, course moderation queue, and vector storage vacuum.
- [x] **Platform Admin Console (`/admin`)**:
  - **📊 System Telemetry**: Metric cards for Users, Published Courses, Enrollments, Vector RAG Chunks, and Role Counts.
  - **👥 User Directory**: Searchable table with instant role promotion dropdowns.
  - **📑 Course Moderation Queue**: Review queue to publish or archive courses.
  - **⚙️ AI Engine Control Panel**: Master switches for AI Model (`Groq / Llama 3.3 70B`, `Gemini 1.5 Pro`, `GPT-4o`) and sliders for `match_threshold` & `match_count`.
  - **🛠️ Maintenance & Reports**: Report Export Studio (CSV/JSON), Vector Storage Vacuum, and Emergency Announcement Broadcast.

---

### 👨‍🏫 Phase 2.9: Instructor / Teacher Workspace (Completed)
- [x] **Instructor Server Engine (`instructor.functions.ts`)**:
  - Class telemetry, student roster progress queries, course material handlers, and AI query insight logs.
- [x] **Teacher Workspace (`/teacher`)**:
  - **📊 Class Telemetry**: Class average quiz scores, total study hours, and Weak Concept Heatmap.
  - **👥 Student Roster & Gradebook**: Searchable student table, progress bars, "At Risk" flags, and 1-Click CSV Export.
  - **📚 Course Material Studio**: Drag-and-drop PDF textbook upload & RAG indexing.
  - **💬 AI Tutor Query Insights**: Anonymized log of top student AI Tutor questions.

---

### 📚 Phase 2.95: Adaptive Curriculum Depth & Continuous Roadmap Expansion (Completed)
- [x] **Autonomous AI Curriculum Depth Sizing (`depth: 'auto' | 'comprehensive' | 'standard' | 'sprint'`)**:
  - **✨ Smart Adaptive (AI-Decided)**: AI evaluates the actual academic / professional breadth of the subject and dynamically allocates as many modules (10–16+) and chapters as needed without artificial truncation.
  - **🎯 Deep Dive Mastery**: 11–16+ comprehensive modules with 5–8 in-depth chapters each (DSA, ML, System Design).
  - **📚 Standard**: 7–10 progressive modules with 4–6 chapters per module.
  - **⚡ Sprint / Crash Course**: 4–6 high-yield modules for urgent exam reviews.
- [x] **High-Density Chapter Specifications**:
  - Replaced the superficial 1-sentence constraint with a rich **2–3 sentence technical synopsis** (mechanics, under-the-hood transitions, edge cases, and practical relevance).
  - Expanded key concepts to **5 to 8 granular sub-concepts, algorithmic patterns, and formulas** per chapter.
  - Scaled schema up to **24 modules** and **14 topics per module**, with a **16,384 token budget**.
- [x] **Roadmap Concept Visualizer (`roadmap.tsx`)**:
  - Removed single-line text truncation and enabled multi-line readable chapter descriptions.
  - Interactive **Concept Pills** rendered under each chapter card so students see exact sub-topics at a glance.
- [x] **Continuous Roadmap Expansion Engine (`expandRoadmap`, `addCustomModule`, `addCustomTopic`)**:
  - **⚡ AI Deepen Track**: Automatic audit of existing modules to identify missing concept pillars and append 2–4 advanced modules.
  - **✏️ Manual Module Builder**: Add custom chapters and topic lists directly from `/roadmap`.
  - **➕ In-Module Topic Addition**: Add focused topics directly to individual modules via `AddTopicModal`.

---

### 📖 Phase 2.96: Masterclass Lesson Notes & Audio Narration Suite (Completed ✅)
- [x] **Masterclass 10-Part Architectural Curriculum (`generateSmartNotes` in `ai.functions.ts`)**:
  - **1. 📌 Conceptual Foundations & Intuitive Mental Model**: Core problem space, naive solution breakdown, and breakthrough insight.
  - **2. 🔬 Under-The-Hood Architecture & Mechanical Invariants**: Memory layout, pointers, data buffers, and state invariants.
  - **3. 📊 Visual Concept Flowchart**: Mermaid.js diagram (`flowchart TD`) with quote-wrapped node labels.
  - **4. 🎬 Interactive Step-by-Step Simulation**: Automated 5-to-8 step JSON simulation script powering `UniversalAnimator`.
  - **5. 💻 Production-Grade Code Walkthrough**: Complete implementations with line-by-line annotations in Python/C++/TypeScript.
  - **6. ⚖️ Complexity & Performance Trade-Off Matrix**: Markdown tables detailing Best, Average, Worst case time, Auxiliary Space, and Cache Locality.
  - **7. ⚠️ Critical Pitfalls & Bug Traps**: Semantic callouts for failure modes (`> ⚠️ Common Bug Trap:`, `> 💡 Pro Tip:`).
  - **8. 🎯 Battle-Tested Problem Patterns**: Classic benchmark problem patterns with strategic blueprints.
  - **9. 🏢 Real-World Industry Application**: Case studies of real production implementations (Linux Kernel, Redis, Postgres, Kafka).
  - **10. 💡 Active Recall with Collapsible Reveals**: Interactive `<details><summary>` cards concealing step-by-step solutions for immediate self-testing.
- [x] **Lesson Reader Toolbar & Audio Synthesis (`focus.$topicId.tsx`)**:
  - **🎙️ Listen Aloud (Text-to-Speech)**: Integrated browser SpeechSynthesis reader with Play, Pause, Resume, and Stop controls for hands-free audio study.
  - **📥 Export Markdown (`.md`)**: One-click download of the complete masterclass notes for Notion/Obsidian.
  - **📋 Copy Full Notes**: One-click clipboard copy of the lesson guide.
  - **🔄 Regenerate**: Force re-run of the masterclass AI note generator with updated 10-part schema.
  - **🧭 Quick Jump Section Pill Strip**: Dynamic table of contents parsing all section headings into clickable navigation pills that smoothly scroll directly to each section anchor.
- [x] **Typography & Interactive Formatter (`FormattedText.tsx`)**:
  - Interactive collapsible accordions for `<details><summary>` elements.
  - Semantic heading anchor IDs (`scroll-mt-24`) for smooth in-page navigation.
  - Syntax-highlighted code viewer with clipboard copy and language badges.

---

### 🛡️ Phase 2.97: High Severity Architecture & Telemetry Remediation (Completed ✅)
- [x] **Telemetry Query Remediation (`admin.functions.ts` & `instructor.functions.ts`)**:
  - Fixed PostgREST column mismatch: Replaced non-existent `score, total` selector with valid `score_percentage`.
  - Added explicit error logging (`quizError`) instead of silent catch fallthroughs.
  - Accurately compute real student average quiz percentage (or `0` when empty) instead of hardcoded `84` / `82` baselines.
  - In instructor analytics, properly scoped quiz attempt calculations to students enrolled in the instructor's courses.
- [x] **System Settings System-Wide Wiring (`settings.server.ts`, `ai.functions.ts`, `rag.server.ts`, `_authenticated/route.tsx`)**:
  - Created high-performance server-side cached reader `getSystemSettingsServer` with automatic invalidation upon admin update.
  - **Master AI Model (`ai_model`)**: `callAI` and `callGroq` dynamically route requests and order candidate models based on admin configuration (e.g., `gemini-1.5-pro`, `qwen-3.8-27b`, `openai/gpt-oss-120b`).
  - **RAG Parameters (`match_threshold` & `match_count`)**: `getGroundedContext` dynamically passes configured values to `match_document_chunks` instead of hardcoding `0.1` and `4`.
  - **Maintenance Mode Enforcement**: When `maintenance_mode` is enabled, non-admin students and instructors are gated by a dedicated maintenance barrier screen with live status polling and sign-out capabilities, while administrators maintain uninterrupted access.
- [x] **Service-Role Fallback Hardening (`client.server.ts`)**:
  - Refuses silent degradation in production: throws a fatal configuration error when `SUPABASE_SERVICE_ROLE_KEY` is missing in production to prevent silent empty RLS query sets.
  - Emits loud, prominent terminal warning banners in development mode.
- [x] **React Hook-Order Integrity (`UniversalAnimator.tsx`)**:
  - Relocated all `useState` and `useEffect` calls above the empty/invalid JSON guard, permanently eliminating `"Rendered more hooks than during previous render"` runtime exceptions during note rendering.

---

### 🧪 Phase 2.98: Review Scheduling Hardening & Unit Test Suite (Completed ✅)
- [x] **Leitner + SM-2 Scheduling Engine (`spaced-repetition.ts`)**:
  - Five-box interval ladder (10 min → 1 day → 3 days → 7 days → 21 days) with a bounded per-card ease factor (`1.3`–`5.0`, default `2.5`).
  - Four grades (`again`, `hard`, `good`, `easy`) each drive a defined box transition, ease delta and due offset; `again` resets to box 1 and increments `lapses`.
  - A `MIN_DELAY_MINUTES` floor (10 min) prevents a zero or negative ease from scheduling a card into the past, and boxes are clamped so corrupt stored rows cannot escape the ladder.
  - The logic was extracted out of `review.functions.ts` into a pure module so it can be tested without the server runtime; `review.functions.ts` re-exports `nextSchedule`, `ReviewGrade` and `Schedule` so existing imports are untouched.
  - Named `spaced-repetition.ts` rather than `fsrs.ts` on purpose: the model is Leitner plus an SM-2 ease factor, not FSRS-4.5.
- [x] **Committed Scheduler Test Suite (`spaced-repetition.test.ts`, Vitest)**:
  - 50 tests covering the interval ladder, the full 4 grades × 5 boxes matrix, ease clamping at both bounds, lapse counting, `review_count` increments, null/corrupt stored state, the minimum-delay guard, timestamp formatting and purity.
  - Test infrastructure added from scratch: Vitest 3.2.7, `vitest.config.ts` (standalone, does not boot the TanStack Start app config), `npm test` / `npm run test:watch` scripts.
  - `npm test` → 50/50 passing; `npx tsc --noEmit` → clean.
- [x] **RAG Threshold Floor Guardrail (`rag-tuning.ts`)**:
  - `MIN_MATCH_THRESHOLD = 0.6` clears the measured noise ceiling of `0.5700`; `MAX_MATCH_THRESHOLD = 0.9` prevents a nonsensically high cutoff. Default stays `0.65`.
  - Enforced in four layers: the admin slider's `min`/`max` plus clamp, the Zod validator (rejects out-of-band input rather than silently coercing it), the read paths in `admin.functions.ts` / `settings.server.ts`, and a clamp at the point of use in `rag.server.ts` so rows written before the guardrail cannot admit noise.
  - The admin hint text now shows why the floor exists.
- [x] **`again` Re-queue Path Confirmed (`review.tsx`)**:
  - Grading a card `again` re-inserts it at box 1 into the session queue (`setRepeated((prev) => [...prev, { ...card, box: 1 }])`), so the card reappears in the same session instead of only ten minutes later.

---

## ⏳ SECTION 2: UPCOMING MASTER PHASES

### 📊 Phase 3: Cognitive Telemetry & Adaptive Review Scheduling (Next Master Phase)
- [x] **Leitner + SM-2 Scheduling Foundation** — shipped in Phase 2.98 as `spaced-repetition.ts` with a committed Vitest suite. The queue now survives reloads and the threshold control is guarded.
- [ ] **FSRS-4.5 Upgrade (`fsrs.ts`)** *(optional, not committed to a date)*:
  - A full FSRS-4.5 model — item stability, retrievability and difficulty rather than a box ladder plus ease — would replace the current scheduler. It is listed as a future upgrade, not as an outstanding defect: the shipped model is measured and tested, and FSRS would need its own calibration data before it could be trusted.
- [ ] **Behavioral Telemetry Logging (`study_behavior_logs`)**:
  - Track active recall latency (time taken to flip cards or answer quiz questions), focus idle times, and rage skips.
- [ ] **Adaptive Study Notifications**:
  - Intelligent reminders based on student chronotype curves (*"Your memory retention for Data Structures is dipping — 5 min review recommended"*).

---

### ♿ Phase 4: Inclusivity, Accessibility & Neurodivergent Focus Modes
- [ ] **ADHD Micro-Chunking Mode**:
  - Breaks 30-minute study topics into 5-minute bite-sized gamified focus sprints.
- [ ] **Dyslexia & Reading Accessibility Suite**:
  - OpenDyslexic font toggle, Bionic Reading (highlighting initial letters of words), and High-Contrast dark mode.
- [ ] **Voice Note Lecture Recorder & TTS**:
  - Record live audio lectures directly into the workspace with automatic transcript chunking.
  - Text-to-Speech audio reader for lesson notes.

---

### 🌐 Phase 5: Zero-Material Equity Engine & Community Study Verse Hub
- [ ] **Photo OCR Textbook Scanner**:
  - Snap photo of paper textbooks or handwritten notes to instantly digitize and create vector-searchable study tracks.
- [ ] **Instant Curriculum Presets**:
  - Pre-built curriculum trees for standard subjects (*OpenStax, CBSE, SAT, AP Physics, Computer Science*).
- [ ] **Public Study Verse Hub**:
  - Community marketplace to publish and clone high-yield flashcard decks and study roadmaps from peers.

---

## 📝 SECTION 3: USER CUSTOM WISHLIST & BACKLOG

*Custom features requested by Professor & Student for upcoming sprint:*

1. **🎬 Interactive Concept Animations & Algorithmic Visual Simulators (Professor Directive)** — ✅ **SHIPPED**:
   - Delivered as `UniversalAnimator` in `src/components/ui/UniversalAnimator.tsx` (the roadmap originally proposed the name `TopicAnimator.tsx`).
   - Controls: Play / Pause, Previous / Next step, Reset, a clickable step-scrub timeline, and three playback speeds (Slow `2.5 s`, `1.5x`, Fast `0.8 s`).
   - Renders four simulation shapes from the AI-generated 5–8 step JSON script: `process_steps`, `graph_network`, `data_bars` and `coordinate_canvas` — enough for sorting swaps, graph/tree traversals, pointer updates, data-structure diagrams and control-flow decision paths.
   - Wired into every lesson body through `FormattedText.tsx`, so the ```` ```animation ```` block in masterclass notes renders as a live simulator rather than text.
   - A live state-variable bar shows the algorithm's working values (`i`, `j`, `swapped`, etc.) at each step.
2. **[Pending Input]**: Additional custom feature requests...

---

## 📁 File Structure & Core System Files

```
StudyVerse/
├── src/
│   ├── components/
│   │   ├── study/
│   │   │   ├── FlashcardDeck.tsx      # Dual-mode Grid & Focus card deck
│   │   │   ├── QuizModal.tsx          # Practice Quiz modal with source citations
│   │   │   └── CreateTrackModal.tsx   # Multi-subject track creation modal
│   │   ├── ui/
│   │   │   ├── FormattedText.tsx      # Publication-grade typography parser
│   │   │   ├── UniversalAnimator.tsx  # Step-by-step algorithm simulator (Play/Pause/Scrub/Speed)
│   │   │   └── MermaidDiagram.tsx     # Client-side Mermaid flowchart renderer
│   │   └── tools/
│   │       └── CodingPlayground.tsx   # Interactive code sandbox
│   ├── lib/
│   │   ├── ai.functions.ts            # AI server functions (Roadmap, Notes, Tutor, Quiz, Cards)
│   │   ├── rag.server.ts              # RAG document chunking & vector search service
│   │   ├── rag-tuning.ts              # Threshold calibration + clampMatchThreshold guardrail
│   │   ├── spaced-repetition.ts       # Pure Leitner + SM-2 scheduler (unit tested)
│   │   ├── spaced-repetition.test.ts  # 50-case Vitest suite for the scheduler
│   │   ├── review.functions.ts        # Due queue + review persistence server functions
│   │   └── progress.functions.ts      # Activity logging & session telemetry
│   └── routes/
│       ├── _authenticated/
│       │   ├── dashboard.tsx          # Main mission dashboard & subject switcher
│       │   ├── focus.$topicId.tsx     # Fullscreen focus session workspace
│       │   ├── onboarding.tsx         # Multi-step intake & syllabus parser
│       │   └── roadmap.tsx            # Visual subject roadmap viewer
├── vitest.config.ts                   # Standalone Vitest config (node env, @ alias)
├── public/
│   ├── favicon.svg                    # StudyVerse SVG emblem favicon
│   └── favicon.ico                    # StudyVerse fallback favicon
└── supabase/
    └── migrations/
        ├── 20260730180000_init_studyverse_os.sql      # Core DB schema
        ├── 20260731000000_multi_subject_syllabus.sql  # Multi-subject schema
        └── 20260731020000_rag_document_chunks.sql     # Vector RAG schema
```
